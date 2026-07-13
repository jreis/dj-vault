/**
 * In-memory short-share store for Vite dev middleware.
 * Production uses Cloudflare KV via functions/_lib/shareStore.ts.
 */

interface ShareRecord {
  v: 1
  encoded: string
  createdAt: string
}

const store = new Map<string, ShareRecord>()
const ID_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const ID_LEN = 10
const MAX_ENCODED_LEN = 120_000

function randomId(): string {
  const bytes = new Uint8Array(ID_LEN)
  crypto.getRandomValues(bytes)
  let out = ""
  for (let i = 0; i < ID_LEN; i++) {
    out += ID_ALPHABET[bytes[i]! % ID_ALPHABET.length]
  }
  return out
}

export function createDevShare(
  encoded: string,
):
  | { ok: true; id: string }
  | { ok: false; status: number; error: string } {
  if (typeof encoded !== "string" || !encoded) {
    return { ok: false, status: 400, error: "Missing encoded payload." }
  }
  if (encoded.length > MAX_ENCODED_LEN) {
    return { ok: false, status: 413, error: "Share payload too large." }
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = randomId()
    if (store.has(id)) continue
    store.set(id, {
      v: 1,
      encoded,
      createdAt: new Date().toISOString(),
    })
    return { ok: true, id }
  }
  return { ok: false, status: 500, error: "Could not allocate share id." }
}

export function getDevShare(
  id: string,
):
  | { ok: true; encoded: string }
  | { ok: false; status: number; error: string } {
  if (!/^[a-zA-Z0-9_-]{4,32}$/.test(id)) {
    return { ok: false, status: 400, error: "Invalid share id." }
  }
  const row = store.get(id)
  if (!row) return { ok: false, status: 404, error: "Share not found." }
  return { ok: true, encoded: row.encoded }
}
