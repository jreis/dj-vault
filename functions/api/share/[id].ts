/**
 * Resolve a short share id.
 *
 * GET /api/share/:id → { encoded: string }
 */

import {
  getShare,
  isValidShareId,
  type ShareEnv,
} from "../../_lib/shareStore.ts"

interface Env extends ShareEnv {}

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
}

type PagesContext = {
  request: Request
  env: Env
  params: { id?: string }
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const id = context.params.id ?? ""
  if (!isValidShareId(id)) {
    return new Response(JSON.stringify({ error: "Invalid share id." }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const result = await getShare(context.env, id)
  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.status,
      headers: {
        ...JSON_HEADERS,
        "Cache-Control": "no-store",
      },
    })
  }

  return new Response(JSON.stringify({ encoded: result.encoded }), {
    status: 200,
    headers: {
      ...JSON_HEADERS,
      // Shares are immutable; cache at the edge briefly.
      "Cache-Control": "public, max-age=300",
    },
  })
}
