/**
 * Published seed catalog: password-gated write, public read.
 *
 * Production stores the catalog in the SHARES KV namespace under a key that
 * cannot collide with short-share ids. Local Vite keeps an in-memory copy
 * and also writes src/data/seedTracks.ts.
 *
 * Binding: SHARES (same KV as short links)
 * Secret:  SEED_ADMIN_SECRET
 */

import { ERAS, GENRES, type Era, type Genre, type Track } from "../../src/types.ts"

/** Minimal KV surface so we don't need @cloudflare/workers-types. */
interface KvLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
}

export interface SeedEnv {
  SHARES?: KvLike
  SEED_ADMIN_SECRET?: string
}

export const SEED_KV_KEY = "seed:catalog"
export const MAX_SEED_TRACKS = 400

export interface PublishedSeedRecord {
  v: 1
  tracks: Track[]
  updatedAt: string
}

const SEED_ID = /^seed-(\d+)$/
const GENRE_SET = new Set<string>(GENRES)
const ERA_SET = new Set<string>(ERAS)

export function nextSeedNumber(tracks: Track[]): number {
  let max = 0
  for (const t of tracks) {
    const m = SEED_ID.exec(t.id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max + 1
}

/**
 * Shape the live library as seed records: keep existing `seed-N` ids so
 * curated playlists still resolve, mint new ones for anything added later,
 * and drop computed fields like bpm.
 */
export function tracksToSeedRecords(
  tracks: Track[],
  opts: { reservedMax?: number } = {},
): Track[] {
  const taken = new Set<string>()
  let next = Math.max(nextSeedNumber(tracks), (opts.reservedMax ?? 0) + 1)
  const out: Track[] = []
  for (const t of tracks) {
    let id = t.id
    if (!SEED_ID.test(id) || taken.has(id)) {
      id = `seed-${next}`
      next += 1
    }
    taken.add(id)
    out.push({
      id,
      title: t.title,
      artist: t.artist,
      youtubeId: t.youtubeId,
      genre: t.genre,
      era: t.era,
      year: t.year,
      score: t.score,
      notes: t.notes,
      addedAt: t.addedAt,
    })
  }
  return out
}

export function parseSeedTrackPayload(raw: unknown): Track[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  if (raw.length > MAX_SEED_TRACKS) return null
  const out: Track[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") return null
    const t = item as Record<string, unknown>
    if (typeof t.id !== "string" || !t.id) return null
    if (typeof t.title !== "string" || !t.title.trim()) return null
    if (typeof t.artist !== "string" || !t.artist.trim()) return null
    if (typeof t.youtubeId !== "string" || !t.youtubeId.trim()) return null
    if (typeof t.genre !== "string" || !GENRE_SET.has(t.genre)) return null
    if (typeof t.era !== "string" || !ERA_SET.has(t.era)) return null
    if (typeof t.year !== "number" || !Number.isFinite(t.year)) return null
    if (typeof t.score !== "number" || !Number.isFinite(t.score)) return null
    if (typeof t.notes !== "string") return null
    if (typeof t.addedAt !== "string" || !t.addedAt) return null
    out.push({
      id: t.id,
      title: t.title.trim(),
      artist: t.artist.trim(),
      youtubeId: t.youtubeId.trim(),
      genre: t.genre as Genre,
      era: t.era as Era,
      year: t.year,
      score: t.score,
      notes: t.notes,
      addedAt: t.addedAt,
    })
  }
  return out
}

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s),
  )
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/** Compare the submitted curator password to SEED_ADMIN_SECRET. */
export async function passwordMatches(
  given: unknown,
  secret: string,
): Promise<boolean> {
  if (!secret) return false
  if (typeof given !== "string" || given.length === 0 || given.length > 256) {
    return false
  }
  const [a, b] = await Promise.all([sha256hex(given), sha256hex(secret)])
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i)! ^ b.charCodeAt(i)!
  }
  return diff === 0
}

export async function getPublishedSeeds(
  env: SeedEnv,
): Promise<Track[] | null> {
  if (!env.SHARES) return null
  const raw = await env.SHARES.get(SEED_KV_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PublishedSeedRecord
    if (parsed?.v !== 1) return null
    return parseSeedTrackPayload(parsed.tracks)
  } catch {
    return null
  }
}

export async function putPublishedSeeds(
  env: SeedEnv,
  tracks: Track[],
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!env.SHARES) {
    return {
      ok: false,
      status: 503,
      error: "Seed publishing needs the SHARES KV binding.",
    }
  }
  const record: PublishedSeedRecord = {
    v: 1,
    tracks,
    updatedAt: new Date().toISOString(),
  }
  await env.SHARES.put(SEED_KV_KEY, JSON.stringify(record))
  return { ok: true }
}
