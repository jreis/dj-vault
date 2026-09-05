/**
 * Social landing for a short share: OG tags for crawlers, then send humans
 * into the vault at /djvault/#s=<id>.
 *
 * GET /s/:id
 */

import { getShare, isValidShareId, type ShareEnv } from "../_lib/shareStore.ts"
import {
  htmlForShare,
  renderShareMissingHtml,
} from "../_lib/shareLanding.ts"

interface Env extends ShareEnv {}

type PagesContext = {
  request: Request
  env: Env
  params: { id?: string }
}

function html(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control":
        status === 200 ? "public, max-age=300" : "no-store",
    },
  })
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const origin = new URL(context.request.url).origin
  const id = context.params.id ?? ""
  if (!isValidShareId(id)) {
    return html(renderShareMissingHtml(origin), 404)
  }

  const result = await getShare(context.env, id)
  if (!result.ok) {
    const status = result.status === 404 || result.status === 400 ? 404 : result.status
    return html(renderShareMissingHtml(origin), status)
  }

  return html(htmlForShare(origin, id, result.encoded), 200)
}
