import { SEED_PLAYLISTS } from "../data/seedPlaylists"
import { SEED_TRACKS } from "../data/seedTracks"
import type { Playlist, Track } from "../types"

/**
 * Throwaway listening-room prototype.
 * Question: what should the home screen be when the songs and the player come first?
 * Three variants, switchable via ?variant=deck|stage|tape. In-memory only.
 */

export const VARIANTS = [
  {
    key: "deck",
    name: "Deck",
    line: "The library sits beside the player. Radio is on the player. Admin, discover, and profile open from a menu.",
  },
  {
    key: "stage",
    name: "Stage",
    line: "The song is the page. The library is a drawer you open. Up next is a filmstrip, not a table.",
  },
  {
    key: "tape",
    name: "Tape",
    line: "The set is the page. Other songs stay hidden until you add one. Playlists replace the set.",
  },
] as const

export type VariantKey = (typeof VARIANTS)[number]["key"]

export function readVariant(): VariantKey {
  const raw = new URLSearchParams(window.location.search).get("variant")
  if (raw === "deck" || raw === "stage" || raw === "tape") return raw
  return "deck"
}

export function writeVariant(key: VariantKey) {
  const url = new URL(window.location.href)
  url.searchParams.set("variant", key)
  window.history.replaceState(null, "", url)
}

export function artUrl(youtubeId: string) {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
}

export function cloneSeeds(): Track[] {
  return SEED_TRACKS.map((track) => ({ ...track }))
}

export function byScore(tracks: Track[]): Track[] {
  return [...tracks].sort(
    (a, b) => b.score - a.score || a.title.localeCompare(b.title),
  )
}

export function findPlaylist(id: string | null): Playlist | undefined {
  if (!id) return undefined
  return SEED_PLAYLISTS.find((playlist) => playlist.id === id)
}

export function tracksInPlaylist(tracks: Track[], id: string): Track[] {
  const playlist = findPlaylist(id)
  if (!playlist) return []
  const order = new Map(playlist.trackIds.map((trackId, index) => [trackId, index]))
  return tracks
    .filter((track) => order.has(track.id))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
}

export function filterTracks(
  tracks: Track[],
  query: string,
  playlistId: string | null,
): Track[] {
  const pool = playlistId ? tracksInPlaylist(tracks, playlistId) : tracks
  const needle = query.trim().toLowerCase()
  const matched = needle
    ? pool.filter((track) =>
        `${track.title} ${track.artist} ${track.genre}`.toLowerCase().includes(needle),
      )
    : pool
  return byScore(matched)
}

export type RoomSnapshot = {
  variant: VariantKey
  playing: boolean
  now: string | null
  queue: string[]
  selected: string | null
  query: string
  playlist: string | null
  scores: string[]
}
