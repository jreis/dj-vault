import type { Era, Genre, Track } from "../types"

/** Compact share payload — keeps URLs shorter than full Track JSON. */
interface SharePayloadV1 {
  v: 1
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

/** Build a shareable URL that embeds the given tracks in the hash. */
export function buildShareUrl(tracks: Track[], baseUrl = window.location.href): string {
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
  const encoded = toBase64Url(JSON.stringify(payload))
  const url = new URL(baseUrl)
  url.hash = `share=${encoded}`
  return url.toString()
}

export function isShareUrlTooLong(url: string, limit = 7000): boolean {
  return url.length > limit
}

/** Parse tracks from a share hash (`#share=…`). Returns null if missing/invalid. */
export function parseShareHash(hash: string): Track[] | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash
  if (!raw.startsWith("share=")) return null
  const encoded = raw.slice("share=".length)
  if (!encoded) return null

  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as SharePayloadV1
    if (parsed?.v !== 1 || !Array.isArray(parsed.tracks) || parsed.tracks.length === 0) {
      return null
    }

    const now = new Date().toISOString()
    const tracks: Track[] = []

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

    return tracks.length > 0 ? tracks : null
  } catch {
    return null
  }
}

/** Read share payload from the current page URL hash. */
export function readShareFromLocation(): Track[] | null {
  if (typeof window === "undefined") return null
  return parseShareHash(window.location.hash)
}

/** Clear the share hash without reloading. */
export function clearShareHash(): void {
  if (typeof window === "undefined") return
  const { pathname, search } = window.location
  window.history.replaceState(null, "", `${pathname}${search}`)
}
