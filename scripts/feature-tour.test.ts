import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { tourSteps } from "../src/lib/featureTour.ts"
import { SEED_TRACKS } from "../src/data/seedTracks.ts"

describe("tourSteps", () => {
  it("names the opening slide after the seed catalog size", () => {
    assert.equal(tourSteps(6)[0]?.title, "🎵 6 Curated Tracks")
    assert.equal(tourSteps(1)[0]?.title, "🎵 1 Curated Track")
    assert.equal(
      tourSteps(SEED_TRACKS.length)[0]?.title,
      `🎵 ${SEED_TRACKS.length} Curated Tracks`,
    )
  })

  it("keeps the rest of the tour the same length", () => {
    assert.equal(tourSteps(6).length, 6)
    assert.equal(tourSteps(6)[1]?.title, "🔍 Smart Discovery")
  })
})
