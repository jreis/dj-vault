import { rankTracksByScore } from "./filterTracks.ts"
import type { Track } from "../types.ts"

export interface AdvanceResult {
  /** Next id to play. Null means stop — the vault has nothing to play. */
  id: string | null
  queue: string[]
}

/**
 * Next song.
 * An explicit queue plays first, including a guest or a playlist song that
 * already left the vault. With an empty queue, walk vault tracks by score
 * and wrap inside that list. Guests, previews, and starter-catalog songs
 * are not in the walk, so starting over cannot land on a song that is not
 * in the vault.
 */
export function advancePlayback(input: {
  vault: Track[]
  nowPlayingId: string | null
  queue: string[]
}): AdvanceResult {
  if (input.queue.length > 0) {
    const [id, ...queue] = input.queue
    return { id: id ?? null, queue }
  }
  const sorted = rankTracksByScore(input.vault)
  if (sorted.length === 0) return { id: null, queue: [] }
  if (!input.nowPlayingId) return { id: sorted[0]!.id, queue: [] }
  const idx = sorted.findIndex((t) => t.id === input.nowPlayingId)
  // A song outside the vault has no place in the ranking. Start over at
  // the top of the vault instead of stepping onto whatever followed it.
  const next = idx >= 0 ? (sorted[idx + 1] ?? sorted[0]) : sorted[0]
  return { id: next?.id ?? null, queue: [] }
}

/** Previous vault song. Wraps inside the vault. Null when the vault is empty. */
export function retreatPlayback(input: {
  vault: Track[]
  nowPlayingId: string | null
}): string | null {
  const sorted = rankTracksByScore(input.vault)
  if (sorted.length === 0) return null
  if (!input.nowPlayingId) return sorted[0]!.id
  const idx = sorted.findIndex((t) => t.id === input.nowPlayingId)
  if (idx < 0) return sorted[sorted.length - 1]!.id
  return (sorted[idx - 1] ?? sorted[sorted.length - 1])!.id
}

export type EmbedDrift = "stay" | "advance" | "restore" | "recue"

/**
 * The YouTube embed left the vault clip.
 * A different video near the end is YouTube starting a suggestion — advance
 * our own queue. A different video earlier is restored. A playhead that
 * jumps back before a cue is the upload starting over, which would play
 * earlier songs from a concert that are not separate vault tracks.
 */
export function embedDrift(input: {
  expectedVideoId: string
  actualVideoId?: string | null
  startSeconds: number
  previousTime: number
  currentTime: number
  /** Upload length in seconds. 0 when the player has not reported it. */
  duration?: number
  /**
   * Length of the vault upload, sampled while that video was playing.
   * After a suggestion loads, `duration` is the new upload and is too long
   * to still look like the end of the clip.
   */
  vaultDuration?: number
  sawExpected: boolean
}): EmbedDrift {
  const actual = input.actualVideoId?.trim() ?? ""
  if (actual && actual !== input.expectedVideoId) {
    if (!input.sawExpected) return "stay"
    const reported = input.duration ?? 0
    const length =
      input.vaultDuration && input.vaultDuration > 0
        ? input.vaultDuration
        : reported
    const nearEnd = length > 0 && input.previousTime >= length - 2
    return nearEnd ? "advance" : "restore"
  }
  if (
    input.startSeconds > 0 &&
    input.previousTime >= input.startSeconds &&
    input.currentTime + 1.5 < input.startSeconds
  ) {
    return "recue"
  }
  return "stay"
}

function videoIdFromWatchUrl(videoUrl?: string | null): string {
  const url = videoUrl?.trim() ?? ""
  if (!url) return ""
  try {
    return new URL(url).searchParams.get("v")?.trim() ?? ""
  } catch {
    return /[?&]v=([A-Za-z0-9_-]{6,})/.exec(url)?.[1] ?? ""
  }
}

/**
 * Video id the embed is actually on.
 * `getVideoData().video_id` can stay on the clip we loaded after YouTube
 * has already started a same-channel suggestion. The watch URL moves first.
 */
export function observedEmbedVideoId(input: {
  expectedVideoId: string
  dataId?: string | null
  videoUrl?: string | null
}): string {
  const fromData = input.dataId?.trim() ?? ""
  const fromUrl = videoIdFromWatchUrl(input.videoUrl)
  if (fromData && fromData !== input.expectedVideoId) return fromData
  if (fromUrl && fromUrl !== input.expectedVideoId) return fromUrl
  return fromData || fromUrl
}
