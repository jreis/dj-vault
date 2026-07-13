/**
 * Create a short share link.
 *
 * POST /api/share  body: { encoded: string }
 * → { id: string }
 *
 * Requires Cloudflare KV binding `SHARES`. Without it, returns 503 so the
 * client can fall back to embedding the payload in the URL hash.
 */

import { createShare, type ShareEnv } from "../../_lib/shareStore.ts"

interface Env extends ShareEnv {}

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
}

type PagesContext = {
  request: Request
  env: Env
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  let body: unknown
  try {
    body = await context.request.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const encoded =
    body &&
    typeof body === "object" &&
    "encoded" in body &&
    typeof (body as { encoded: unknown }).encoded === "string"
      ? (body as { encoded: string }).encoded
      : ""

  const result = await createShare(context.env, encoded)
  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.status,
      headers: JSON_HEADERS,
    })
  }

  return new Response(JSON.stringify({ id: result.id }), {
    status: 201,
    headers: JSON_HEADERS,
  })
}

export async function onRequestGet(): Promise<Response> {
  return new Response(
    JSON.stringify({
      service: "dj-vault-share",
      methods: ["POST"],
      note: "POST { encoded } to create a short share id.",
    }),
    { status: 200, headers: JSON_HEADERS },
  )
}
