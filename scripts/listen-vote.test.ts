import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { shouldAwardListenVote } from "../src/lib/listenVote.ts"

const base = {
  durationSec: 100,
  maxHeardSec: 80,
  alreadyAwarded: false,
  downvotedThisSession: false,
  endedFromError: false,
}

describe("shouldAwardListenVote", () => {
  it("awards when most of the track was heard", () => {
    assert.equal(shouldAwardListenVote(base), true)
  })

  it("rejects a skip before the listen threshold", () => {
    assert.equal(shouldAwardListenVote({ ...base, maxHeardSec: 79 }), false)
  })

  it("rejects a second award in the same session", () => {
    assert.equal(shouldAwardListenVote({ ...base, alreadyAwarded: true }), false)
  })

  it("rejects a track the user downvoted this session", () => {
    assert.equal(
      shouldAwardListenVote({ ...base, downvotedThisSession: true }),
      false,
    )
  })

  it("rejects an error skip", () => {
    assert.equal(shouldAwardListenVote({ ...base, endedFromError: true }), false)
  })

  it("rejects unknown duration", () => {
    assert.equal(shouldAwardListenVote({ ...base, durationSec: 0 }), false)
  })

  it("measures from a concert cue point to the end", () => {
    assert.equal(
      shouldAwardListenVote({
        ...base,
        durationSec: 200,
        startSeconds: 100,
        maxHeardSec: 180,
      }),
      true,
    )
    assert.equal(
      shouldAwardListenVote({
        ...base,
        durationSec: 200,
        startSeconds: 100,
        maxHeardSec: 170,
      }),
      false,
    )
  })
})
