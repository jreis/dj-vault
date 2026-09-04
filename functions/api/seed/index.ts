/**
 * Published seed catalog.
 *
 * GET  /api/seed  → { tracks: Track[] | null }
 * POST /api/seed  body: { password: string, tracks: Track[] }
 *               → { ok: true, count: number }
 *
 * POST requires env SEED_ADMIN_SECRET (Encrypt in the Pages dashboard).
 * Catalog is stored in the SHARES KV namespace.
 */

import {
  getPublishedSeeds,
  parseSeedTrackPayload,
  passwordMatches,
  putPublishedSeeds,
  tracksToSeedRecords,
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
  const tracks = await getPublishedSeeds(context.env)
  return new Response(JSON.stringify({ tracks }), {
    status: 200,
    headers: {
      ...JSON_HEADERS,
      "Cache-Control": "no-store",
    },
  })
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

  const existing = await getPublishedSeeds(context.env)
  const reservedMax = existing
    ? Math.max(
        0,
        ...existing.map((t) => {
          const m = /^seed-(\d+)$/.exec(t.id)
          return m ? Number(m[1]) : 0
        }),
      )
    : 0
  const seeds = tracksToSeedRecords(parsed, { reservedMax })
  const saved = await putPublishedSeeds(context.env, seeds)
  if (!saved.ok) {
    return new Response(JSON.stringify({ error: saved.error }), {
      status: saved.status,
      headers: JSON_HEADERS,
    })
  }

  return new Response(JSON.stringify({ ok: true, count: seeds.length }), {
    status: 200,
    headers: JSON_HEADERS,
  })
}
