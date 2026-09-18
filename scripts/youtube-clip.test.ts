import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  clipKey,
  formatStartTime,
  parseTimestampToSeconds,
  parseYouTubeClip,
  parseYouTubeId,
  youtubeWatchUrl,
} from "../src/lib/youtube.ts"

describe("parseTimestampToSeconds", () => {
  it("reads plain seconds, clocks, and YouTube tokens", () => {
    assert.equal(parseTimestampToSeconds("90"), 90)
    assert.equal(parseTimestampToSeconds("1:30"), 90)
    assert.equal(parseTimestampToSeconds("1:02:03"), 3723)
    assert.equal(parseTimestampToSeconds("1h2m3s"), 3723)
    assert.equal(parseTimestampToSeconds("83m"), 4980)
    assert.equal(parseTimestampToSeconds("bad"), null)
  })
})

describe("parseYouTubeClip", () => {
  it("reads a watch URL with t=", () => {
    const clip = parseYouTubeClip(
      "https://www.youtube.com/watch?v=dQw4w9wgGcQ&t=1h23m45s",
    )
    assert.deepEqual(clip, { youtubeId: "dQw4w9wgGcQ", startSeconds: 5025 })
  })

  it("reads youtu.be with a hash time", () => {
    const clip = parseYouTubeClip("https://youtu.be/dQw4w9wgGcQ#t=90")
    assert.deepEqual(clip, { youtubeId: "dQw4w9wgGcQ", startSeconds: 90 })
  })

  it("treats a bare id as start 0", () => {
    assert.deepEqual(parseYouTubeClip("dQw4w9wgGcQ"), {
      youtubeId: "dQw4w9wgGcQ",
      startSeconds: 0,
    })
    assert.equal(parseYouTubeId("dQw4w9wgGcQ"), "dQw4w9wgGcQ")
  })
})

describe("formatStartTime / watch URL", () => {
  it("writes a cue that round-trips", () => {
    assert.equal(formatStartTime(90), "1:30")
    assert.equal(formatStartTime(3723), "1:02:03")
    assert.equal(
      youtubeWatchUrl("dQw4w9wgGcQ", 90),
      "https://www.youtube.com/watch?v=dQw4w9wgGcQ&t=90",
    )
    assert.equal(clipKey("dQw4w9wgGcQ", 90), "dQw4w9wgGcQ@90")
  })
})
