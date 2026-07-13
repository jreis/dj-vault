/**
 * Short share link storage (Cloudflare KV).
 *
 * Binding: SHARES (KV namespace) — optional.
 * Without it, POST returns 503 and the client falls back to hash URLs.
 */

/** Minimal KV surface so we don't need @cloudflare/workers-types at build time. */
interface KvLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
}

export interface ShareEnv {
  SHARES?: KvLike
}

export interface ShareRecord {
  v: 1
  encoded: string
  createdAt: string
}

const MAX_ENCODED_LEN = 120_000
const ID_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const ID_LEN = 10

export function isShareStorageConfigured(env: ShareEnv): boolean {
  return Boolean(env.SHARES)
}

function randomId(): string {
  const bytes = new Uint8Array(ID_LEN)
  crypto.getRandomValues(bytes)
  let out = ""
  for (let i = 0; i < ID_LEN; i++) {
    out += ID_ALPHABET[bytes[i]! % ID_ALPHABET.length]
  }
  return out
}

export function isValidShareId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{4,32}$/.test(id)
}

export async function createShare(
  env: ShareEnv,
  encoded: string,
): Promise<{ ok: true; id: string } | { ok: false; status: number; error: string }> {
  if (!env.SHARES) {
    return {
      ok: false,
      status: 503,
      error: "Short links not configured (SHARES KV binding missing).",
    }
  }
  if (typeof encoded !== "string" || !encoded) {
    return { ok: false, status: 400, error: "Missing encoded payload." }
  }
  if (encoded.length > MAX_ENCODED_LEN) {
    return { ok: false, status: 413, error: "Share payload too large." }
  }

  const record: ShareRecord = {
    v: 1,
    encoded,
    createdAt: new Date().toISOString(),
  }
  const body = JSON.stringify(record)

  // Retry a few times on improbable id collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = randomId()
    const existing = await env.SHARES.get(id)
    if (existing) continue
    await env.SHARES.put(id, body)
    return { ok: true, id }
  }

  return { ok: false, status: 500, error: "Could not allocate share id." }
}

export async function getShare(
  env: ShareEnv,
  id: string,
): Promise<
  | { ok: true; encoded: string }
  | { ok: false; status: number; error: string }
> {
  if (!env.SHARES) {
    return {
      ok: false,
      status: 503,
      error: "Short links not configured (SHARES KV binding missing).",
    }
  }
  if (!isValidShareId(id)) {
    return { ok: false, status: 400, error: "Invalid share id." }
  }

  const raw = await env.SHARES.get(id)
  if (!raw) {
    return { ok: false, status: 404, error: "Share not found." }
  }

  try {
    const parsed = JSON.parse(raw) as ShareRecord
    if (parsed?.v !== 1 || typeof parsed.encoded !== "string") {
      return { ok: false, status: 500, error: "Corrupt share record." }
    }
    return { ok: true, encoded: parsed.encoded }
  } catch {
    return { ok: false, status: 500, error: "Corrupt share record." }
  }
}
