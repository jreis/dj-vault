import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  advancePlayback,
  embedDrift,
  retreatPlayback,
} from "../src/lib/playbackOrder.ts"
import type { Track } from "../src/types.ts"

function track(over: Partial<Track> & Pick<Track, "id" | "title" | "score">): Track {
  return {
    artist: "Band",
    youtubeId: over.id,
    genre: "Metal",
    era: "90s",
    year: 1991,
    notes: "",
    addedAt: "2025-01-01T00:00:00.000Z",
    ...over,
  }
}

describe("advancePlayback", () => {
  const vault = [
    track({ id: "high", title: "High", score: 4 }),
    track({ id: "mid", title: "Mid", score: 2 }),
    track({ id: "low", title: "Low", score: 0 }),
  ]

  it("wraps to the top of the vault after the last vault song", () => {
    const next = advancePlayback({
      vault,
      nowPlayingId: "low",
      queue: [],
    })
    assert.equal(next.id, "high")
    assert.deepEqual(next.queue, [])
  })

  it("starts over at the top of the vault after a song that is not in it", () => {
    const next = advancePlayback({
      vault,
      nowPlayingId: "guest-not-in-vault",
      queue: [],
    })
    assert.equal(next.id, "high")
  })

  it("walks the vault by score before wrapping", () => {
    const next = advancePlayback({
      vault,
      nowPlayingId: "high",
      queue: [],
    })
    assert.equal(next.id, "mid")
  })

  it("plays an explicit queue before the vault walk", () => {
    const next = advancePlayback({
      vault,
      nowPlayingId: "high",
      queue: ["guest-queued", "mid"],
    })
    assert.equal(next.id, "guest-queued")
    assert.deepEqual(next.queue, ["mid"])
  })

  it("stops when the vault and the queue are empty", () => {
    const next = advancePlayback({
      vault: [],
      nowPlayingId: "guest-not-in-vault",
      queue: [],
    })
    assert.equal(next.id, null)
  })
})

describe("retreatPlayback", () => {
  const vault = [
    track({ id: "high", title: "High", score: 4 }),
    track({ id: "low", title: "Low", score: 0 }),
  ]

  it("wraps to the last vault song from the top", () => {
    assert.equal(
      retreatPlayback({ vault, nowPlayingId: "high" }),
      "low",
    )
  })

  it("does not land on a song outside the vault when stepping back from one", () => {
    assert.equal(
      retreatPlayback({ vault, nowPlayingId: "guest-not-in-vault" }),
      "low",
    )
  })
})

describe("embedDrift", () => {
  it("advances when YouTube starts another video at the end of the clip", () => {
    assert.equal(
      embedDrift({
        expectedVideoId: "vaultvideo1",
        actualVideoId: "suggested99",
        startSeconds: 0,
        previousTime: 200,
        currentTime: 1,
        duration: 201,
        sawExpected: true,
      }),
      "advance",
    )
  })

  it("restores the vault video when YouTube switches away mid-song", () => {
    assert.equal(
      embedDrift({
        expectedVideoId: "vaultvideo1",
        actualVideoId: "suggested99",
        startSeconds: 90,
        previousTime: 40,
        currentTime: 1,
        duration: 201,
        sawExpected: true,
      }),
      "restore",
    )
  })

  it("ignores a foreign id until the vault video has actually played", () => {
    assert.equal(
      embedDrift({
        expectedVideoId: "vaultvideo1",
        actualVideoId: "suggested99",
        startSeconds: 0,
        previousTime: 0,
        currentTime: 0,
        duration: 201,
        sawExpected: false,
      }),
      "stay",
    )
  })

  it("recues when a concert upload starts over before the vault song", () => {
    assert.equal(
      embedDrift({
        expectedVideoId: "concert11111",
        actualVideoId: "concert11111",
        startSeconds: 754,
        previousTime: 900,
        currentTime: 2,
        duration: 3600,
        sawExpected: true,
      }),
      "recue",
    )
  })

  it("stays during normal playback of the vault clip", () => {
    assert.equal(
      embedDrift({
        expectedVideoId: "concert11111",
        actualVideoId: "concert11111",
        startSeconds: 754,
        previousTime: 800,
        currentTime: 801,
        duration: 3600,
        sawExpected: true,
      }),
      "stay",
    )
  })

  it("advances when a same-channel suggestion reports a longer duration", () => {
    // The clip ended at ~209s. YouTube has already loaded the next upload
    // from that channel, so getDuration() is the suggestion, not the clip.
    assert.equal(
      embedDrift({
        expectedVideoId: "fugazi-waiting",
        actualVideoId: "fugazi-suggestion",
        startSeconds: 0,
        previousTime: 209,
        currentTime: 0.5,
        duration: 240,
        vaultDuration: 211,
        sawExpected: true,
      }),
      "advance",
    )
  })
})
