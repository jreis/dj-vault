import type { Track } from "../types.ts"
import { findSimilarTracks } from "./similarTracks.ts"

/** How many tracks ride along with a shared seed (including the seed). */
export const TRACK_SHARE_SET_SIZE = 10

/**
 * A shareable set: the seed first, then the closest vault kin.
 * Recipients play this as a guest set — they don't need the sharer's library.
 */
export function buildTrackShareSet(
  seed: Track,
  library: Track[],
  limit = TRACK_SHARE_SET_SIZE,
): Track[] {
  const rest = findSimilarTracks(seed, library, Math.max(0, limit - 1)).map(
    (m) => m.track,
  )
  const seen = new Set<string>([seed.id, seed.youtubeId])
  const extras: Track[] = []
  for (const t of rest) {
    if (seen.has(t.id) || seen.has(t.youtubeId)) continue
    seen.add(t.id)
    seen.add(t.youtubeId)
    extras.push(t)
  }
  return [seed, ...extras]
}

export function trackShareSetName(seed: Track): string {
  const title = seed.title.trim() || "this track"
  return `If you like ${title}`.slice(0, 80)
}

export function trackShareMeta(
  seed: Pick<Track, "title" | "artist" | "youtubeId">,
  trackCount: number,
): { title: string; description: string; image: string } {
  const title = seed.title.trim() || "Untitled"
  const artist = seed.artist.trim() || "Unknown artist"
  const count = Math.max(1, trackCount)
  return {
    title: `${title} — ${artist}`,
    description:
      count === 1
        ? `Play “${title}” by ${artist} in DJ Vault.`
        : `A ${count}-track DJ Vault set in the spirit of “${title}” by ${artist}.`,
    image: `https://i.ytimg.com/vi/${seed.youtubeId}/hqdefault.jpg`,
  }
}
