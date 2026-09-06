import type { Track } from "../types.ts"

export interface DiscoverVideo {
  youtubeId: string
  title: string
  channelTitle: string
  thumbnailUrl: string
}

export type DiscoverErrorCode =
  | "missing_key"
  | "disabled"
  | "quota_exceeded"
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

/** sessionStorage key: epoch ms until client should stop hitting the discover API. */
const CLIENT_BLOCK_UNTIL_KEY = "dj-vault-yt-discover-blocked-until"

function clientBlockUntil(): number {
  try {
    const raw = sessionStorage.getItem(CLIENT_BLOCK_UNTIL_KEY)
    if (!raw) return 0
    const n = Number(raw)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

/** Remember not to call the discover API until `untilMs` (session-scoped). */
export function blockDiscoverClientUntil(untilMs: number): void {
  try {
    sessionStorage.setItem(CLIENT_BLOCK_UNTIL_KEY, String(untilMs))
  } catch {
    // private mode / quota — ignore
  }
}

/**
 * Pause client-side discover calls until ~midnight Pacific (quota reset)
 * or a few hours as a safe default.
 */
export function blockDiscoverForQuotaDay(): void {
  // ~16h is enough to cover “rest of today PT” without needing TZ math in the browser.
  // Server already circuits until true midnight Pacific.
  const until = Date.now() + 16 * 60 * 60 * 1000
  blockDiscoverClientUntil(until)
}

export function isDiscoverClientBlocked(): boolean {
  return Date.now() < clientBlockUntil()
}

/**
 * One or two words, no digits — "Elvis", "Charli XCX" — not a song title
 * like "Evanescence About Us".
 */
export function looksLikeArtistQuery(q: string): boolean {
  const words = q.trim().split(/\s+/).filter(Boolean)
  return words.length > 0 && words.length <= 2 && !/\d/.test(q)
}

/**
 * Enter in the vault search box. Lookup-only: never dumps YouTube results
 * into the library. "Play best of" is a separate, explicit button.
 */
export function youtubeSearchFromEnter(query: string): {
  query: string
  playBestOf: false
} {
  return { query: query.trim(), playBestOf: false }
}

export function titleCaseQuery(q: string): string {
  return q
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
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

function normSongText(s: string): string {
  return s
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** Artist + cleaned title so lyric videos and remasters match the vault copy. */
export function songIdentity(title: string, artist: string): string {
  return `${normSongText(artist)}\t${normSongText(cleanVideoTitle(title))}`
}

export function isSameSong(
  a: { title: string; artist: string },
  b: { title: string; artist: string },
): boolean {
  return songIdentity(a.title, a.artist) === songIdentity(b.title, b.artist)
}

/**
 * Drop YouTube hits that are the seed, already in the library, or repeats of
 * each other — even when the video id differs (lyric video, remaster, VEVO).
 */
export function filterNewDiscoveries(
  items: DiscoverVideo[],
  seed: { title: string; artist: string; youtubeId: string },
  library: Array<{ title: string; artist: string; youtubeId: string }>,
): DiscoverVideo[] {
  const taken = new Set<string>([
    seed.youtubeId,
    songIdentity(seed.title, seed.artist),
  ])
  for (const t of library) {
    if (t.youtubeId) taken.add(t.youtubeId)
    taken.add(songIdentity(t.title, t.artist))
  }
  const kept: DiscoverVideo[] = []
  for (const video of items) {
    if (taken.has(video.youtubeId)) continue
    const meta = guessTitleArtist(video.title, video.channelTitle)
    const key = songIdentity(meta.title, meta.artist)
    if (taken.has(key)) continue
    taken.add(video.youtubeId)
    taken.add(key)
    kept.push(video)
  }
  return kept
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
 *
 * Skips the network call when the client knows discovery is disabled / out of quota.
 */
export async function fetchSimilarVideos(
  seed: Track,
  library: Track[],
  signal?: AbortSignal,
): Promise<{ items: DiscoverVideo[]; query: string }> {
  if (isDiscoverClientBlocked()) {
    throw new DiscoverError(
      "YouTube discovery is paused (quota or disabled). Try again after the daily reset, or use the search links.",
      "quota_exceeded",
    )
  }

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
    if (code === "quota_exceeded" || code === "disabled") {
      blockDiscoverForQuotaDay()
    }
    throw new DiscoverError(
      data.error ?? `Discovery failed (${res.status})`,
      code,
    )
  }

  return {
    items: filterNewDiscoveries(data.items ?? [], seed, library),
    query: data.query ?? "",
  }
}

/**
 * Search YouTube by a literal free-text query (artist, title, or both) for
 * the add-track flow. Shares the same server-side quota budget and
 * client-side backoff as fetchSimilarVideos.
 */
export async function searchYouTubeVideos(
  query: string,
  exclude: Set<string>,
  signal?: AbortSignal,
): Promise<{ items: DiscoverVideo[]; query: string }> {
  if (isDiscoverClientBlocked()) {
    throw new DiscoverError(
      "YouTube search is paused (quota or disabled). Try again after the daily reset, or paste a YouTube link.",
      "quota_exceeded",
    )
  }

  const params = new URLSearchParams({
    q: query,
    exclude: [...exclude].slice(0, 60).join(","),
  })

  let res: Response
  try {
    res = await fetch(`/api/youtube/search?${params}`, { signal })
  } catch (e) {
    if (signal?.aborted) throw e
    throw new DiscoverError("Network error reaching search API", "network")
  }

  let data: DiscoverApiResponse
  try {
    data = (await res.json()) as DiscoverApiResponse
  } catch {
    throw new DiscoverError("Bad response from search API", "upstream")
  }

  if (!res.ok) {
    const code = data.code ?? "upstream"
    if (code === "quota_exceeded" || code === "disabled") {
      blockDiscoverForQuotaDay()
    }
    throw new DiscoverError(data.error ?? `Search failed (${res.status})`, code)
  }

  return {
    items: data.items ?? [],
    query: data.query ?? "",
  }
}
