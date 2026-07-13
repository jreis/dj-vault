import type { Era, Genre, Track } from "../types"

/** Compact share payload — keeps URLs shorter than full Track JSON. */
export interface SharePayloadV1 {
  v: 1
  /** Optional playlist / set name. */
  name?: string
  tracks: Array<{
    t: string
    a: string
    y: string
    g: Genre
    e: Era
    yr: number
    s?: number
    n?: string
  }>
}

export interface ParsedShare {
  name: string | null
  tracks: Track[]
}

const GENRES = new Set([
  "Metal",
  "Grunge",
  "Punk",
  "Alternative",
  "Hard Rock",
  "Nu Metal",
  "Classic Rock",
  "Other",
])

const ERAS = new Set(["70s", "80s", "90s", "00s", "10s", "20s"])

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(encoded: string): string {
  const pad = encoded.length % 4 === 0 ? "" : "=".repeat(4 - (encoded.length % 4))
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/") + pad
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

function uid(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function tracksToSharePayload(
  tracks: Track[],
  name?: string | null,
): SharePayloadV1 {
  const payload: SharePayloadV1 = {
    v: 1,
    tracks: tracks.map((t) => ({
      t: t.title,
      a: t.artist,
      y: t.youtubeId,
      g: t.genre,
      e: t.era,
      yr: t.year,
      ...(t.score !== 0 ? { s: t.score } : {}),
      ...(t.notes ? { n: t.notes } : {}),
    })),
  }
  const trimmed = name?.trim()
  if (trimmed) payload.name = trimmed.slice(0, 80)
  return payload
}

export function encodeSharePayload(payload: SharePayloadV1): string {
  return toBase64Url(JSON.stringify(payload))
}

export function decodeSharePayload(encoded: string): ParsedShare | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as SharePayloadV1
    if (parsed?.v !== 1 || !Array.isArray(parsed.tracks) || parsed.tracks.length === 0) {
      return null
    }

    const now = new Date().toISOString()
    const tracks: Track[] = []
    const name =
      typeof parsed.name === "string" && parsed.name.trim()
        ? parsed.name.trim().slice(0, 80)
        : null

    for (const row of parsed.tracks) {
      if (
        typeof row.t !== "string" ||
        typeof row.a !== "string" ||
        typeof row.y !== "string" ||
        !/^[\w-]{11}$/.test(row.y) ||
        !GENRES.has(row.g) ||
        !ERAS.has(row.e) ||
        typeof row.yr !== "number"
      ) {
        continue
      }
      tracks.push({
        id: uid(),
        title: row.t.trim().slice(0, 200),
        artist: row.a.trim().slice(0, 200),
        youtubeId: row.y,
        genre: row.g,
        era: row.e,
        year: Math.round(row.yr),
        score: typeof row.s === "number" ? Math.round(row.s) : 0,
        notes: typeof row.n === "string" ? row.n.trim().slice(0, 500) : "",
        addedAt: now,
      })
    }

    return tracks.length > 0 ? { name, tracks } : null
  } catch {
    return null
  }
}

/** Build a shareable URL that embeds the given tracks in the hash. */
export function buildShareUrl(
  tracks: Track[],
  options: { name?: string | null; baseUrl?: string } = {},
): string {
  const payload = tracksToSharePayload(tracks, options.name)
  const encoded = encodeSharePayload(payload)
  const url = new URL(options.baseUrl ?? window.location.href)
  url.hash = `share=${encoded}`
  return url.toString()
}

/** Short share URL (`#s=<id>`) when server storage is available. */
export function buildShortShareUrl(
  shortId: string,
  baseUrl = window.location.href,
): string {
  const url = new URL(baseUrl)
  url.hash = `s=${shortId}`
  return url.toString()
}

export function isShareUrlTooLong(url: string, limit = 7000): boolean {
  return url.length > limit
}

/** Parse tracks from a share hash (`#share=…` or `#s=…`). */
export function parseShareHash(hash: string): ParsedShare | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash
  if (raw.startsWith("share=")) {
    const encoded = raw.slice("share=".length)
    if (!encoded) return null
    return decodeSharePayload(encoded)
  }
  return null
}

/** Extract short share id from hash (`#s=abc123`). */
export function parseShortShareId(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash
  if (!raw.startsWith("s=")) return null
  const id = raw.slice(2).trim()
  if (!/^[a-zA-Z0-9_-]{4,32}$/.test(id)) return null
  return id
}

/** Read inline share payload from the current page URL hash. */
export function readShareFromLocation(): ParsedShare | null {
  if (typeof window === "undefined") return null
  return parseShareHash(window.location.hash)
}

/** Read short share id from the current page URL hash. */
export function readShortShareIdFromLocation(): string | null {
  if (typeof window === "undefined") return null
  return parseShortShareId(window.location.hash)
}

/** Clear the share hash without reloading. */
export function clearShareHash(): void {
  if (typeof window === "undefined") return
  const { pathname, search } = window.location
  window.history.replaceState(null, "", `${pathname}${search}`)
}
