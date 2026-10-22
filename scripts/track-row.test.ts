import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { observedEmbedVideoId } from "../src/lib/playbackOrder.ts"
import { fallbackSelection, trackRowFlags } from "../src/lib/trackRow.ts"

describe("trackRowFlags", () => {
  it("puts the amber row on the song that is playing", () => {
    const playing = trackRowFlags(
      "fugazi-waiting",
      "fugazi-suggestion",
      "fugazi-waiting",
    )
    const cursor = trackRowFlags(
      "fugazi-suggestion",
      "fugazi-suggestion",
      "fugazi-waiting",
    )
    assert.equal(playing.highlighted, true)
    assert.equal(playing.cursor, false)
    assert.equal(cursor.highlighted, false)
    assert.equal(cursor.cursor, true)
  })

  it("highlights the selection when nothing is playing", () => {
    const row = trackRowFlags("a", "a", null)
    const other = trackRowFlags("b", "a", null)
    assert.equal(row.highlighted, true)
    assert.equal(row.cursor, false)
    assert.equal(other.highlighted, false)
    assert.equal(other.cursor, false)
  })
})

describe("fallbackSelection", () => {
  it("keeps the playing song when the old selection left the list", () => {
    assert.equal(
      fallbackSelection("hidden", "fugazi-waiting", [
        "fugazi-suggestion",
        "fugazi-waiting",
      ]),
      "fugazi-waiting",
    )
  })

  it("does not move a visible keyboard cursor", () => {
    assert.equal(
      fallbackSelection("fugazi-suggestion", "fugazi-waiting", [
        "fugazi-suggestion",
        "fugazi-waiting",
      ]),
      "fugazi-suggestion",
    )
  })
})

describe("observedEmbedVideoId", () => {
  it("trusts a watch URL that has left the vault clip", () => {
    assert.equal(
      observedEmbedVideoId({
        expectedVideoId: "fugazi-waiting",
        dataId: "fugazi-waiting",
        videoUrl: "https://www.youtube.com/watch?v=fugazi-suggestion",
      }),
      "fugazi-suggestion",
    )
  })

  it("keeps the vault clip when both sources still name it", () => {
    assert.equal(
      observedEmbedVideoId({
        expectedVideoId: "fugazi-waiting",
        dataId: "fugazi-waiting",
        videoUrl: "https://www.youtube.com/watch?v=fugazi-waiting&t=12",
      }),
      "fugazi-waiting",
    )
  })
})
