import {
  buildShareUrl,
  buildShortShareUrl,
  decodeSharePayload,
  encodeSharePayload,
  isShareUrlTooLong,
  tracksToSharePayload,
  type ParsedShare,
} from "./shareLink"
import type { Track } from "../types"

export type ShareCreateResult =
  | { ok: true; url: string; short: boolean }
  | { ok: false; error: string }

/**
 * Prefer a short server-stored link when available; fall back to hash payload.
 * Short links need Cloudflare KV (`SHARES` binding) on the deployed site.
 */
export async function createShareLink(
  tracks: Track[],
  options: { name?: string | null } = {},
): Promise<ShareCreateResult> {
  if (tracks.length === 0) {
    return { ok: false, error: "No tracks to share." }
  }

  const payload = tracksToSharePayload(tracks, options.name)
  const encoded = encodeSharePayload(payload)

  try {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ encoded }),
    })
    if (res.ok) {
      const data = (await res.json()) as { id?: string }
      if (data.id && /^[a-zA-Z0-9_-]{4,32}$/.test(data.id)) {
        return { ok: true, url: buildShortShareUrl(data.id), short: true }
      }
    }
    // 503 / missing KV → fall through to hash URL
  } catch {
    // offline / no function → hash URL
  }

  const url = buildShareUrl(tracks, { name: options.name })
  if (isShareUrlTooLong(url)) {
    return {
      ok: false,
      error: "Link too long — use Export JSON for large libraries.",
    }
  }
  return { ok: true, url, short: false }
}

/** Resolve a short share id to tracks (+ optional name). */
export async function fetchShortShare(
  id: string,
): Promise<ParsedShare | null> {
  try {
    const res = await fetch(`/api/share/${encodeURIComponent(id)}`)
    if (!res.ok) return null
    const data = (await res.json()) as { encoded?: string; payload?: unknown }
    if (typeof data.encoded === "string") {
      return decodeSharePayload(data.encoded)
    }
    // Allow raw payload from older/dev handlers
    if (data.payload && typeof data.payload === "object") {
      return decodeSharePayload(
        encodeSharePayload(data.payload as Parameters<typeof encodeSharePayload>[0]),
      )
    }
    return null
  } catch {
    return null
  }
}
