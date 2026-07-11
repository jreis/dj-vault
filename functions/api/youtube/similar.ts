/**
 * Proxy YouTube Data API search for similar / discovery videos.
 *
 * Secrets / env (Cloudflare Pages → Settings → Environment variables):
 *   YOUTUBE_API_KEY              — required for discovery
 *   YOUTUBE_DISCOVERY_ENABLED    — optional; set false/0/off to hard-disable
 *                                  (stops all Google calls without removing the key)
 *
 * GET /api/youtube/similar?artist=&title=&genre=&year=&exclude=
 *
 * Auto-pauses on free-tier quota exhaustion until midnight Pacific.
 */

import {
  handleSimilarSearch,
  type DiscoveryEnv,
} from "../../_lib/youtubeSimilar.ts"

interface Env extends DiscoveryEnv {}

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
}

type PagesContext = {
  request: Request
  env: Env
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const url = new URL(context.request.url)
  const result = await handleSimilarSearch(url.searchParams, context.env)

  const headers: Record<string, string> = { ...JSON_HEADERS }
  if (result.cacheControl) {
    headers["Cache-Control"] = result.cacheControl
  }

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers,
  })
}
