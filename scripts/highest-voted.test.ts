import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  filterAndSortTracks,
  highestVotedTrackId,
  rankTracksByScore,
} from "../src/lib/filterTracks.ts"
import type { Filters, Track } from "../src/types.ts"

const scoreDesc: Filters = {
  query: "",
  genre: "All",
  era: "All",
  sortKey: "score",
  sortDir: "desc",
}

function track(over: Partial<Track> & Pick<Track, "id" | "title">): Track {
  return {
    artist: "Test",
    youtubeId: "xxxxxxxxxxx",
    genre: "Metal",
    era: "90s",
    year: 1991,
    score: 0,
    notes: "",
    addedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  }
}

describe("highestVotedTrackId", () => {
  it("returns null for an empty library", () => {
    assert.equal(highestVotedTrackId([]), null)
  })

  it("selects the unique highest score", () => {
    const tracks = [
      track({ id: "low", title: "Aaa", score: 1 }),
      track({ id: "top", title: "Zzz", score: 4 }),
      track({ id: "mid", title: "Mmm", score: 2 }),
    ]
    assert.equal(highestVotedTrackId(tracks), "top")
  })

  it("selects the first track in the list when two are ranked 1", () => {
    const apple = track({ id: "apple", title: "Apple", score: 9 })
    const zebra = track({ id: "zebra", title: "Zebra", score: 9 })
    const lower = track({ id: "lower", title: "Lower", score: 1 })
    // Library order puts Apple ahead of Zebra. The score-desc track list
    // breaks that tie the other way, and selection follows the list.
    const library = [apple, lower, zebra]
    const listed = filterAndSortTracks(library, scoreDesc)
    assert.equal(listed[0]?.id, "zebra")
    assert.equal(listed[1]?.id, "apple")
    assert.equal(highestVotedTrackId(library), listed[0]?.id)
    assert.deepEqual(
      rankTracksByScore(library).map((t) => t.id),
      listed.map((t) => t.id),
    )
  })

  it("keeps the earlier row when the tied titles match", () => {
    const first = track({ id: "first", title: "Same", score: 3 })
    const second = track({
      id: "second",
      title: "Same",
      score: 3,
      addedAt: "2026-02-01T00:00:00.000Z",
    })
    const library = [first, second]
    assert.equal(rankTracksByScore(library)[0]?.id, "first")
    assert.equal(highestVotedTrackId(library), "first")
  })
})
