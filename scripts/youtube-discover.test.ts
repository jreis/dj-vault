import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  cleanVideoTitle,
  decodeHtmlEntities,
  guessTitleArtist,
  isSameSong,
  pickAlternateVideo,
  repairHtmlEntities,
  stripTitleQuotes,
  youtubeSearchFromEnter,
  type DiscoverVideo,
} from "../src/lib/youtubeDiscover.ts"

function video(
  over: Partial<DiscoverVideo> & Pick<DiscoverVideo, "youtubeId" | "title">,
): DiscoverVideo {
  return {
    channelTitle: "Pearl Jam",
    thumbnailUrl: "",
    ...over,
  }
}

describe("youtubeSearchFromEnter", () => {
  it("does not auto-add artist searches to the vault", () => {
    assert.deepEqual(youtubeSearchFromEnter("Elvis"), {
      query: "Elvis",
      playBestOf: false,
    })
    assert.deepEqual(youtubeSearchFromEnter("Charli XCX"), {
      query: "Charli XCX",
      playBestOf: false,
    })
    assert.deepEqual(youtubeSearchFromEnter("Metallica"), {
      query: "Metallica",
      playBestOf: false,
    })
  })

  it("does not auto-add song-title searches to the vault", () => {
    assert.deepEqual(youtubeSearchFromEnter("Evanescence About Us"), {
      query: "Evanescence About Us",
      playBestOf: false,
    })
  })

  it("trims the query", () => {
    assert.deepEqual(youtubeSearchFromEnter("  Elvis  "), {
      query: "Elvis",
      playBestOf: false,
    })
  })
})

describe("html entities in titles", () => {
  it("turns &quot; and &#39; back into quotes", () => {
    assert.equal(
      decodeHtmlEntities("Pink Floyd &quot;Wish You Were Here&quot;"),
      'Pink Floyd "Wish You Were Here"',
    )
    assert.equal(
      decodeHtmlEntities("Guns N&#39; Roses &amp; friends"),
      "Guns N' Roses & friends",
    )
    assert.equal(
      decodeHtmlEntities("Double &amp;quot;encoded&amp;quot;"),
      'Double "encoded"',
    )
  })

  it("drops quotes from a YouTube title, including HTML escapes", () => {
    assert.equal(
      cleanVideoTitle(
        "Pink Floyd - &quot;Wish You Were Here&quot; (Official Video)",
      ),
      "Pink Floyd - Wish You Were Here",
    )
    assert.deepEqual(
      guessTitleArtist(
        "Pink Floyd - &quot;Wish You Were Here&quot; (Official Video)",
        "PinkFloydVEVO",
      ),
      { artist: "Pink Floyd", title: "Wish You Were Here" },
    )
    assert.equal(
      stripTitleQuotes('"See You On The Other Side"'),
      "See You On The Other Side",
    )
    assert.equal(stripTitleQuotes("Don't Stop"), "Don't Stop")
  })

  it("drops an upload parenthetical and a broken Official leftover", () => {
    assert.equal(
      cleanVideoTitle("The Outside (Official Lyric Video)"),
      "The Outside",
    )
    assert.equal(cleanVideoTitle("The Outside (Official)"), "The Outside")
    assert.equal(cleanVideoTitle("The Outside (Official"), "The Outside")
    assert.equal(
      cleanVideoTitle("Somebody That I Used to Know (feat. Kimbra)"),
      "Somebody That I Used to Know (feat. Kimbra)",
    )
    assert.equal(cleanVideoTitle("Fade to Black (Live)"), "Fade to Black (Live)")
    assert.equal(
      cleanVideoTitle("Fade to Black [Original 1984 Studio Recording]"),
      "Fade to Black",
    )
    assert.equal(
      cleanVideoTitle("Fade to Black (Original 1984 Studio Recording)"),
      "Fade to Black",
    )
    const [fixed] = repairHtmlEntities([
      { title: "The Outside (Official", artist: "Phoebe Bridgers" },
    ])
    assert.equal(fixed?.title, "The Outside")
    assert.equal(fixed?.artist, "Phoebe Bridgers")
  })

  it("treats an escaped title as the same song as the decoded one", () => {
    assert.equal(
      isSameSong(
        { title: "&quot;Alive&quot;", artist: "Pearl Jam" },
        { title: '"Alive"', artist: "Pearl Jam" },
      ),
      true,
    )
  })

  it("repairs titles already saved in the library", () => {
    const [fixed] = repairHtmlEntities([
      {
        title: "Bohemian Rhapsody &quot;Live&quot;",
        artist: "Queen &#39;75",
      },
    ])
    assert.equal(fixed?.title, "Bohemian Rhapsody Live")
    assert.equal(fixed?.artist, "Queen '75")
  })
})

describe("pickAlternateVideo", () => {
  const alive = {
    title: "Alive",
    artist: "Pearl Jam",
    youtubeId: "MS91knuzoOA",
  }

  it("keeps Alive and swaps the upload, skipping Jeremy", () => {
    const alt = pickAlternateVideo(alive, [
      video({
        youtubeId: "MS91knuzoOA",
        title: "Pearl Jam - Jeremy (Official 4K Video)",
      }),
      video({
        youtubeId: "jeremy-id-xx",
        title: "Pearl Jam - Jeremy (Official Video)",
      }),
      video({
        youtubeId: "qM0zINtulhM",
        title: "Pearl Jam - Alive (Official Video)",
        channelTitle: "PearljamVEVO",
      }),
    ])
    assert.equal(alt?.youtubeId, "qM0zINtulhM")
  })

  it("matches a live title that does not parse as Artist - Song", () => {
    const alt = pickAlternateVideo(alive, [
      video({
        youtubeId: "nL3RLO1-oQI",
        title: "Alive (Live) - MTV Unplugged - Pearl Jam",
        channelTitle: "Pearl Jam",
      }),
    ])
    assert.equal(alt?.youtubeId, "nL3RLO1-oQI")
  })

  it("returns null when every Alive upload has already failed", () => {
    const alt = pickAlternateVideo(
      alive,
      [
        video({
          youtubeId: "qM0zINtulhM",
          title: "Pearl Jam - Alive (Official Video)",
        }),
      ],
      new Set(["qM0zINtulhM"]),
    )
    assert.equal(alt, null)
  })
})
