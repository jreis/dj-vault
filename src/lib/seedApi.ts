import type { Playlist, Track } from "../types"

export type PublishedCatalog = {
  tracks: Track[]
  /** null when the live catalog predates playlist publishing. */
  playlists: Playlist[] | null
}

export type PublishSeedResult =
  | { ok: true; count: number; playlistCount: number; wroteFile: boolean }
  | { ok: false; status: number; error: string }

export async function fetchPublishedSeeds(): Promise<PublishedCatalog | null> {
  try {
    const res = await fetch("/api/seed", { cache: "no-store" })
    if (!res.ok) return null
    const data = (await res.json()) as {
      tracks?: unknown
      playlists?: unknown
    }
    if (!Array.isArray(data.tracks) || data.tracks.length === 0) return null
    const playlists = Array.isArray(data.playlists)
      ? (data.playlists as Playlist[])
      : null
    return { tracks: data.tracks as Track[], playlists }
  } catch {
    return null
  }
}

export async function publishSeeds(
  tracks: Track[],
  playlists: Playlist[],
  password: string,
): Promise<PublishSeedResult> {
  try {
    const res = await fetch("/api/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracks, playlists, password }),
    })
    const data = (await res.json().catch(() => null)) as
      | {
          ok?: boolean
          count?: number
          playlistCount?: number
          wroteFile?: boolean
          error?: string
        }
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
      playlistCount:
        typeof data.playlistCount === "number" ? data.playlistCount : 0,
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
