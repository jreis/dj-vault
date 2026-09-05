import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { videoMatchesArtistQuery } from "../functions/_lib/youtubeSimilar.ts"

describe("videoMatchesArtistQuery", () => {
  it("keeps official Elvis videos", () => {
    assert.equal(
      videoMatchesArtistQuery(
        {
          title: "Elvis Presley - Suspicious Minds (Official Music Video)",
          channelTitle: "ElvisPresleyVEVO",
        },
        "elvis",
      ),
      true,
    )
  })

  it("drops unrelated mega-hits from a viewCount artist search", () => {
    assert.equal(
      videoMatchesArtistQuery(
        {
          title: "Eminem - Without Me (Official Music Video)",
          channelTitle: "EminemVEVO",
        },
        "elvis",
      ),
      false,
    )
  })
})
