import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  bindMediaSession,
  syncScreenWakeLock,
  type MediaSessionLike,
  type WakeLockLike,
  type WakeLockSentinelLike,
} from "../src/lib/playbackSession.ts"

function fakeSession(): MediaSessionLike & {
  handlers: Record<string, (() => void) | null>
} {
  const handlers: Record<string, (() => void) | null> = {}
  return {
    metadata: null,
    playbackState: "none",
    handlers,
    setActionHandler(action, handler) {
      handlers[action] = handler
    },
  }
}

describe("bindMediaSession", () => {
  it("publishes the playing track to the lock screen", () => {
    const session = fakeSession()
    bindMediaSession(
      session,
      {
        title: "Walk",
        artist: "Pantera",
        artworkUrl: "https://i.ytimg.com/vi/abc/mqdefault.jpg",
      },
      { onPlay() {}, onPause() {}, onNext() {}, onPrev() {} },
    )
    assert.equal(session.playbackState, "playing")
    assert.equal(session.metadata?.title, "Walk")
    assert.equal(session.metadata?.artist, "Pantera")
    assert.equal(typeof session.handlers.play, "function")
    assert.equal(typeof session.handlers.nexttrack, "function")
  })

  it("clears lock-screen handlers when nothing is playing", () => {
    const session = fakeSession()
    bindMediaSession(
      session,
      { title: "Walk", artist: "Pantera", artworkUrl: "x" },
      { onPlay() {}, onPause() {}, onNext() {}, onPrev() {} },
    )
    bindMediaSession(session, null, {})
    assert.equal(session.playbackState, "none")
    assert.equal(session.metadata, null)
    assert.equal(session.handlers.play, null)
    assert.equal(session.handlers.nexttrack, null)
  })

  it("is a no-op without a mediaSession API", () => {
    bindMediaSession(null, {
      title: "Walk",
      artist: "Pantera",
      artworkUrl: "x",
    }, {})
  })
})

describe("syncScreenWakeLock", () => {
  it("holds a screen lock while a track is playing in the foreground", async () => {
    const sentinel: WakeLockSentinelLike = {
      released: false,
      async release() {
        this.released = true
      },
    }
    const api: WakeLockLike = {
      async request(type) {
        assert.equal(type, "screen")
        return sentinel
      },
    }
    const held = await syncScreenWakeLock(api, true, null)
    assert.equal(held, sentinel)
    assert.equal(sentinel.released, false)
  })

  it("releases the lock when playback stops", async () => {
    const sentinel: WakeLockSentinelLike = {
      released: false,
      async release() {
        this.released = true
      },
    }
    const next = await syncScreenWakeLock(null, false, sentinel)
    assert.equal(next, null)
    assert.equal(sentinel.released, true)
  })
})
