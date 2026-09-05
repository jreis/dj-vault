import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { youtubeSearchFromEnter } from "../src/lib/youtubeDiscover.ts"

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
