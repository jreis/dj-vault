import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Track } from "../src/types.ts"
import { findSimilarTracks } from "../src/lib/similarTracks.ts"
import {
  filterNewDiscoveries,
  uniqueDiscoverVideos,
  uniqueSongs,
} from "../src/lib/youtubeDiscover.ts"

function track(
  over: Partial<Track> & Pick<Track, "id" | "title" | "artist" | "youtubeId">,
): Track {
  return {
    genre: "Metal",
    era: "10s",
    year: 2018,
    score: 11,
    notes: "Set energy",
    addedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  }
}

const danceMacabre = track({
  id: "seed-21",
  title: "Dance Macabre",
  artist: "Ghost",
  youtubeId: "7Gr63DiEUxw",
})

const rats = track({
  id: "ghost-rats",
  title: "Rats",
  artist: "Ghost",
  youtubeId: "aaaaaaaaaaa",
  year: 2018,
})

const sandman = track({
  id: "seed-1",
  title: "Enter Sandman",
  artist: "Metallica",
  youtubeId: "CD-E-LDc384",
  era: "90s",
  year: 1991,
  notes: "Set opener energy",
})

describe("findSimilarTracks", () => {
  it("does not list another upload of the same song as similar", () => {
    const lyricUpload = track({
      id: "ghost-dance-lyrics",
      title: "Dance Macabre",
      artist: "Ghost",
      youtubeId: "bbbbbbbbbbb",
    })
    const matches = findSimilarTracks(danceMacabre, [
      danceMacabre,
      lyricUpload,
      rats,
      sandman,
    ])
    assert.equal(
      matches.filter((m) => m.track.title === "Dance Macabre").length,
      0,
    )
    assert.ok(matches.some((m) => m.track.id === rats.id))
  })

  it("keeps one copy when the vault already has the same song twice", () => {
    const puppetsA = track({
      id: "puppets-a",
      title: "Master of Puppets",
      artist: "Metallica",
      youtubeId: "ccccccccccc",
      era: "80s",
      year: 1986,
      notes: "Thrash masterpiece",
    })
    const puppetsB = track({
      id: "puppets-b",
      title: "Master of Puppets (Official Video)",
      artist: "Metallica",
      youtubeId: "ddddddddddd",
      era: "80s",
      year: 1986,
      notes: "Thrash masterpiece",
    })
    const matches = findSimilarTracks(sandman, [
      sandman,
      puppetsA,
      puppetsB,
      danceMacabre,
    ])
    const puppetsHits = matches.filter((m) =>
      m.track.title.toLowerCase().includes("puppets"),
    )
    assert.equal(puppetsHits.length, 1)
  })
})

describe("filterNewDiscoveries", () => {
  it("drops a YouTube result that is the seed song under a noisier title", () => {
    const kept = filterNewDiscoveries(
      [
        {
          youtubeId: "eeeeeeeeeee",
          title: "Ghost - Dance Macabre (Official Music Video)",
          channelTitle: "Ghost",
          thumbnailUrl: "",
        },
        {
          youtubeId: "fffffffffff",
          title: "Ghost - Square Hammer (Official)",
          channelTitle: "Ghost",
          thumbnailUrl: "",
        },
      ],
      danceMacabre,
      [danceMacabre],
    )
    assert.deepEqual(
      kept.map((v) => v.youtubeId),
      ["fffffffffff"],
    )
  })

  it("drops a YouTube result the vault already has as a different upload", () => {
    const kept = filterNewDiscoveries(
      [
        {
          youtubeId: "ggggggggggg",
          title: "Ghost - Rats (Lyrics)",
          channelTitle: "Ghost",
          thumbnailUrl: "",
        },
      ],
      danceMacabre,
      [danceMacabre, rats],
    )
    assert.equal(kept.length, 0)
  })

  it("keeps only the first of two YouTube hits for the same song", () => {
    const kept = filterNewDiscoveries(
      [
        {
          youtubeId: "hhhhhhhhhhh",
          title: "Ghost - Square Hammer",
          channelTitle: "Ghost",
          thumbnailUrl: "",
        },
        {
          youtubeId: "iiiiiiiiiii",
          title: "Square Hammer (Official Music Video)",
          channelTitle: "Ghost",
          thumbnailUrl: "",
        },
      ],
      danceMacabre,
      [danceMacabre],
    )
    assert.deepEqual(
      kept.map((v) => v.youtubeId),
      ["hhhhhhhhhhh"],
    )
  })
})

describe("uniqueDiscoverVideos", () => {
  it("keeps one Walk from a Pantera best-of search", () => {
    const kept = uniqueDiscoverVideos([
      {
        youtubeId: "walkofficial",
        title: "Pantera - Walk (Official Music Video)",
        channelTitle: "PanteraVEVO",
        thumbnailUrl: "",
      },
      {
        youtubeId: "walkaudioxx",
        title: "Pantera - Walk (Official Audio)",
        channelTitle: "PanteraVEVO",
        thumbnailUrl: "",
      },
      {
        youtubeId: "walklyricsx",
        title: "Walk (Lyrics)",
        channelTitle: "Pantera",
        thumbnailUrl: "",
      },
      {
        youtubeId: "cowboysfrom",
        title: "Pantera - Cowboys From Hell (Official Video)",
        channelTitle: "PanteraVEVO",
        thumbnailUrl: "",
      },
    ])
    assert.deepEqual(
      kept.map((v) => v.youtubeId),
      ["walkofficial", "cowboysfrom"],
    )
  })
})

describe("uniqueSongs", () => {
  it("collapses best-of discoveries that are the same song", () => {
    const kept = uniqueSongs([
      { title: "Walk", artist: "Pantera", youtubeId: "walkofficial" },
      { title: "Walk (Official Audio)", artist: "Pantera", youtubeId: "walkaudioxx" },
      { title: "Cowboys From Hell", artist: "Pantera", youtubeId: "cowboysfrom" },
    ])
    assert.deepEqual(
      kept.map((s) => s.youtubeId),
      ["walkofficial", "cowboysfrom"],
    )
  })
})
