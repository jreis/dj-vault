import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Track } from "../src/types.ts"
import {
  repairDeadYoutubeIds,
  SEED_TRACKS,
} from "../src/data/seedTracks.ts"

function track(
  over: Partial<Track> & Pick<Track, "id" | "title" | "youtubeId">,
): Track {
  return {
    artist: "Pearl Jam",
    genre: "Grunge",
    era: "90s",
    year: 1991,
    score: 10,
    notes: "",
    addedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  }
}

describe("SEED_TRACKS Alive", () => {
  it("points at the official Alive video, not Jeremy", () => {
    const alive = SEED_TRACKS.find((t) => t.id === "seed-10")
    assert.ok(alive)
    assert.equal(alive.title, "Alive")
    assert.equal(alive.artist, "Pearl Jam")
    assert.equal(alive.youtubeId, "qM0zINtulhM")
  })
})

describe("repairDeadYoutubeIds", () => {
  it("heals persisted Alive rows that still have the Jeremy id", () => {
    const [healed] = repairDeadYoutubeIds([
      track({
        id: "seed-10",
        title: "Alive",
        youtubeId: "MS91knuzoOA",
      }),
    ])
    assert.equal(healed?.youtubeId, "qM0zINtulhM")
  })

  it("leaves custom youtube ids alone", () => {
    const custom = track({
      id: "t_mine",
      title: "Alive",
      youtubeId: "wGiTPgvKktM",
    })
    const input = [custom]
    const next = repairDeadYoutubeIds(input)
    assert.equal(next[0]?.youtubeId, "wGiTPgvKktM")
    assert.equal(next, input)
  })
})
