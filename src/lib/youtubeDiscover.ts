import type { Track } from "../types"

export interface DiscoverVideo {
  youtubeId: string
  title: string
  channelTitle: string
  thumbnailUrl: string
}

export type DiscoverErrorCode =
  | "missing_key"
  | "upstream"
  | "bad_request"
  | "network"

export class DiscoverError extends Error {
  code: DiscoverErrorCode
  constructor(message: string, code: DiscoverErrorCode) {
    super(message)
    this.name = "DiscoverError"
    this.code = code
  }
}

interface DiscoverApiResponse {
  items?: DiscoverVideo[]
  query?: string
  error?: string
  code?: DiscoverErrorCode
}

/** Strip common YouTube title noise for vault metadata. */
export function cleanVideoTitle(raw: string): string {
  return raw
    .replace(
      /\s*[([{]?\s*(official\s*(music\s*)?video|official\s*audio|lyrics?(\s*video)?|audio|hd|hq|4k|remaster(ed)?|visuali[sz]er|topic)\s*[)\]}]?\s*/gi,
      " ",
    )
    .replace(/\s{2,}/g, " ")
    .trim()
}

/**
 * Guess title + artist from a YouTube video title and channel name.
 * Handles "Artist - Song", "Song by Artist", otherwise uses channel as artist.
 */
export function guessTitleArtist(
  videoTitle: string,
  channelTitle: string,
): { title: string; artist: string } {
  const cleaned = cleanVideoTitle(videoTitle)

  const byMatch = cleaned.match(/^(.+?)\s+by\s+(.+)$/i)
  if (byMatch) {
    return { title: byMatch[1].trim(), artist: byMatch[2].trim() }
  }

  const dash = cleaned.match(/^(.+?)\s+[-–—]\s+(.+)$/)
  if (dash) {
    const left = dash[1].trim()
    const right = dash[2].trim()
    if (left.length <= 40) {
      return { artist: left, title: right }
    }
  }

  const artist =
    channelTitle
      .replace(/\s*[-–—]\s*Topic\s*$/i, "")
      .replace(/\s*VEVO\s*$/i, "")
      .trim() || "Unknown"

  return { title: cleaned || videoTitle, artist }
}

/**
 * Fetch similar videos via the Cloudflare Pages Function (or Vite dev proxy).
 * Absolute path so the SPA under /djvault/ still hits site-root /api.
 */
export async function fetchSimilarVideos(
  seed: Track,
  library: Track[],
  signal?: AbortSignal,
): Promise<{ items: DiscoverVideo[]; query: string }> {
  const exclude = new Set<string>([seed.youtubeId])
  for (const t of library) {
    if (t.youtubeId) exclude.add(t.youtubeId)
  }

  const params = new URLSearchParams({
    artist: seed.artist,
    title: seed.title,
    genre: seed.genre,
    year: String(seed.year),
    exclude: [...exclude].slice(0, 60).join(","),
  })

  let res: Response
  try {
    res = await fetch(`/api/youtube/similar?${params}`, { signal })
  } catch (e) {
    if (signal?.aborted) throw e
    throw new DiscoverError("Network error reaching discovery API", "network")
  }

  let data: DiscoverApiResponse
  try {
    data = (await res.json()) as DiscoverApiResponse
  } catch {
    throw new DiscoverError("Bad response from discovery API", "upstream")
  }

  if (!res.ok) {
    const code = data.code ?? "upstream"
    throw new DiscoverError(
      data.error ?? `Discovery failed (${res.status})`,
      code,
    )
  }

  return {
    items: data.items ?? [],
    query: data.query ?? "",
  }
}
