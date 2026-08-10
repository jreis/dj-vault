/**
 * Proxy YouTube Data API search for literal add-track queries
 * (as opposed to /api/youtube/similar's "similar to this seed track" search).
 *
 * Shares the same YOUTUBE_API_KEY / YOUTUBE_DISCOVERY_ENABLED env vars and
 * quota circuit breaker as /api/youtube/similar — see functions/_lib/youtubeSimilar.ts.
 *
 * GET /api/youtube/search?q=&exclude=
 */

import {
  handleTrackSearch,
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
  const result = await handleTrackSearch(url.searchParams, context.env)

  const headers: Record<string, string> = { ...JSON_HEADERS }
  if (result.cacheControl) {
    headers["Cache-Control"] = result.cacheControl
  }

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers,
  })
}
