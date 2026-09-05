/**
 * Published seed catalog.
 *
 * GET  /api/seed  → { tracks: Track[] | null, playlists: Playlist[] | null }
 * POST /api/seed  body: { password: string, tracks: Track[], playlists?: Playlist[] }
 *               → { ok: true, count: number, playlistCount: number }
 *
 * POST requires env SEED_ADMIN_SECRET (Encrypt in the Pages dashboard).
 * Catalog is stored in the SHARES KV namespace.
 */

import {
  catalogToSeedRecords,
  getPublishedCatalog,
  parseSeedPlaylistPayload,
  parseSeedTrackPayload,
  passwordMatches,
  putPublishedCatalog,
  type SeedEnv,
} from "../../_lib/seedCatalog.ts"

interface Env extends SeedEnv {}

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
}

type PagesContext = {
  request: Request
  env: Env
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const catalog = await getPublishedCatalog(context.env)
  return new Response(
    JSON.stringify({
      tracks: catalog?.tracks ?? null,
      playlists: catalog?.playlists ?? null,
    }),
    {
      status: 200,
      headers: {
        ...JSON_HEADERS,
        "Cache-Control": "no-store",
      },
    },
  )
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const secret = context.env.SEED_ADMIN_SECRET?.trim() ?? ""
  if (!secret) {
    return new Response(
      JSON.stringify({ error: "Seed publishing is not configured." }),
      { status: 503, headers: JSON_HEADERS },
    )
  }

  let body: unknown
  try {
    body = await context.request.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const password =
    body &&
    typeof body === "object" &&
    "password" in body
      ? (body as { password: unknown }).password
      : ""

  if (!(await passwordMatches(password, secret))) {
    return new Response(JSON.stringify({ error: "Wrong password." }), {
      status: 401,
      headers: JSON_HEADERS,
    })
  }

  const rawTracks =
    body && typeof body === "object" && "tracks" in body
      ? (body as { tracks: unknown }).tracks
      : null
  const parsed = parseSeedTrackPayload(rawTracks)
  if (!parsed) {
    return new Response(
      JSON.stringify({ error: "Need a non-empty array of valid tracks." }),
      { status: 400, headers: JSON_HEADERS },
    )
  }

  const existing = await getPublishedCatalog(context.env)
  const reservedMax = existing
    ? Math.max(
        0,
        ...existing.tracks.map((t) => {
          const m = /^seed-(\d+)$/.exec(t.id)
          return m ? Number(m[1]) : 0
        }),
      )
    : 0

  const hasPlaylists =
    body && typeof body === "object" && "playlists" in body
  const parsedPlaylists = hasPlaylists
    ? parseSeedPlaylistPayload((body as { playlists: unknown }).playlists)
    : (existing?.playlists ?? [])
  if (parsedPlaylists === null) {
    return new Response(
      JSON.stringify({ error: "Playlists must be an array of valid playlists." }),
      { status: 400, headers: JSON_HEADERS },
    )
  }

  const catalog = catalogToSeedRecords(parsed, parsedPlaylists, { reservedMax })
  const saved = await putPublishedCatalog(context.env, catalog)
  if (!saved.ok) {
    return new Response(JSON.stringify({ error: saved.error }), {
      status: saved.status,
      headers: JSON_HEADERS,
    })
  }

  return new Response(
    JSON.stringify({
      ok: true,
      count: catalog.tracks.length,
      playlistCount: catalog.playlists.length,
    }),
    {
      status: 200,
      headers: JSON_HEADERS,
    },
  )
}
