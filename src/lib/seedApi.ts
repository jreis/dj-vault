import type { Track } from "../types"

export type PublishSeedResult =
  | { ok: true; count: number; wroteFile: boolean }
  | { ok: false; status: number; error: string }

export async function fetchPublishedSeeds(): Promise<Track[] | null> {
  try {
    const res = await fetch("/api/seed", { cache: "no-store" })
    if (!res.ok) return null
    const data = (await res.json()) as { tracks?: unknown }
    return Array.isArray(data.tracks) && data.tracks.length > 0
      ? (data.tracks as Track[])
      : null
  } catch {
    return null
  }
}

export async function publishSeeds(
  tracks: Track[],
  password: string,
): Promise<PublishSeedResult> {
  try {
    const res = await fetch("/api/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracks, password }),
    })
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; count?: number; wroteFile?: boolean; error?: string }
      | null
    if (!res.ok || !data?.ok || typeof data.count !== "number") {
      return {
        ok: false,
        status: res.status,
        error: data?.error ?? "Could not publish seed catalog.",
      }
    }
    return {
      ok: true,
      count: data.count,
      wroteFile: Boolean(data.wroteFile),
    }
  } catch {
    return {
      ok: false,
      status: 0,
      error: "Could not reach the seed publisher.",
    }
  }
}
