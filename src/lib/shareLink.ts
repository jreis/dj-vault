import type { Track } from "../types.ts"
import {
  decodeSharePayload,
  encodeSharePayload,
  tracksToSharePayload,
  type ParsedShare,
} from "./sharePayload.ts"

export type { ParsedShare, SharePayloadV1 } from "./sharePayload.ts"
export {
  decodeSharePayload,
  encodeSharePayload,
  tracksToSharePayload,
}

/** Build a shareable URL that embeds the given tracks in the hash. */
export function buildShareUrl(
  tracks: Track[],
  options: { name?: string | null; baseUrl?: string } = {},
): string {
  const payload = tracksToSharePayload(tracks, options.name)
  const encoded = encodeSharePayload(payload)
  const url = new URL(options.baseUrl ?? window.location.href)
  url.hash = `share=${encoded}`
  return url.toString()
}

/** Short share URL (`#s=<id>`) when server storage is available. */
export function buildShortShareUrl(
  shortId: string,
  baseUrl = window.location.href,
): string {
  const url = new URL(baseUrl)
  url.hash = `s=${shortId}`
  return url.toString()
}

/**
 * Hash-free URL so social crawlers can unfurl OG tags.
 * Served by `functions/s/[id].ts`; humans are sent on to `#s=<id>`.
 */
export function buildSocialShareUrl(
  shortId: string,
  baseUrl = typeof window !== "undefined"
    ? window.location.href
    : "https://jasonreis.dev/",
): string {
  const origin = new URL(baseUrl).origin
  return `${origin}/s/${encodeURIComponent(shortId)}`
}

export function isShareUrlTooLong(url: string, limit = 7000): boolean {
  return url.length > limit
}

/** Parse tracks from a share hash (`#share=…` or `#s=…`). */
export function parseShareHash(hash: string): ParsedShare | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash
  if (raw.startsWith("share=")) {
    const encoded = raw.slice("share=".length)
    if (!encoded) return null
    return decodeSharePayload(encoded)
  }
  return null
}

/** Extract short share id from hash (`#s=abc123`). */
export function parseShortShareId(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash
  if (!raw.startsWith("s=")) return null
  const id = raw.slice(2).trim()
  if (!/^[a-zA-Z0-9_-]{4,32}$/.test(id)) return null
  return id
}

/** Read inline share payload from the current page URL hash. */
export function readShareFromLocation(): ParsedShare | null {
  if (typeof window === "undefined") return null
  return parseShareHash(window.location.hash)
}

/** Read short share id from the current page URL hash. */
export function readShortShareIdFromLocation(): string | null {
  if (typeof window === "undefined") return null
  return parseShortShareId(window.location.hash)
}

/** Clear the share hash without reloading. */
export function clearShareHash(): void {
  if (typeof window === "undefined") return
  const { pathname, search } = window.location
  window.history.replaceState(null, "", `${pathname}${search}`)
}
