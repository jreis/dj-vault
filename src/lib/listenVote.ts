/** Fraction of duration that must be heard before a listen vote. */
export const LISTEN_AWARD_RATIO = 0.8

export interface ListenAwardInput {
  durationSec: number
  maxHeardSec: number
  alreadyAwarded: boolean
  downvotedThisSession: boolean
  endedFromError: boolean
  /** Cue point; listen ratio is measured from here to the end. */
  startSeconds?: number
}

/** True when a completed listen should add one vote. */
export function shouldAwardListenVote(input: ListenAwardInput): boolean {
  if (input.endedFromError) return false
  if (input.alreadyAwarded) return false
  if (input.downvotedThisSession) return false
  if (!(input.durationSec > 0)) return false
  const start = input.startSeconds && input.startSeconds > 0 ? input.startSeconds : 0
  const span = input.durationSec - start
  if (!(span > 0)) return false
  const heard = input.maxHeardSec - start
  if (!(heard >= 0)) return false
  return heard / span >= LISTEN_AWARD_RATIO
}
