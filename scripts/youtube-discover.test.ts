import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  pickAlternateVideo,
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
