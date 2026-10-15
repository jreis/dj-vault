import type { Track } from "../types.ts"

/** Where a playlist may still find a song after it leaves the vault. */
export interface PlaylistTrackSources {
  /** Songs still in the vault. A vault copy wins. */
  library: Track[]
  /** Snapshot taken when a song left the vault but a playlist still lists it. */
  held: Track[]
  /** Published or bundled starter catalog. */
  seeds: Track[]
  guestTracks?: Track[]
  previewTrack?: Track | null
}

/**
 * Resolve one playable song.
 * Vault copy, then guest or preview, then the catalog, then the snapshot
 * kept after the song was removed.
 */
export function findPlayableTrack(
  id: string,
  sources: PlaylistTrackSources,
): Track | undefined {
  return (
    sources.library.find((t) => t.id === id) ??
    sources.guestTracks?.find((t) => t.id === id) ??
    (sources.previewTrack?.id === id ? sources.previewTrack : undefined) ??
    sources.seeds.find((t) => t.id === id) ??
    sources.held.find((t) => t.id === id)
  )
}

/** Songs a playlist can start, in playlist order. Skips ids nobody can resolve. */
export function tracksForPlaylist(
  trackIds: string[],
  sources: PlaylistTrackSources,
): Track[] {
  const out: Track[] = []
  const seen = new Set<string>()
  for (const id of trackIds) {
    if (!id || seen.has(id)) continue
    const track = findPlayableTrack(id, sources)
    if (!track) continue
    seen.add(id)
    out.push(track)
  }
  return out
}

/**
 * Remember a song a playlist still names. Drop the copy when nothing lists it.
 */
export function holdRemovedTrack(
  held: Track[],
  playlists: { trackIds: string[] }[],
  removed: Track | undefined,
): Track[] {
  if (!removed) return releaseUnheldTracks(held, playlists)
  const referenced = playlists.some((p) => p.trackIds.includes(removed.id))
  const rest = held.filter((t) => t.id !== removed.id)
  const next = referenced ? [...rest, removed] : rest
  return releaseUnheldTracks(next, playlists)
}

/** Drop snapshots no playlist still references. */
export function releaseUnheldTracks(
  held: Track[],
  playlists: { trackIds: string[] }[],
): Track[] {
  const ids = new Set(playlists.flatMap((p) => p.trackIds))
  return held.filter((t) => ids.has(t.id))
}

/**
 * Playlist ids that can still be played: vault, snapshot, or starter catalog.
 */
export function idsPlaylistsCanKeep(
  libraryIds: Iterable<string>,
  held: Track[],
  seeds: Track[],
): Set<string> {
  const keep = new Set<string>(libraryIds)
  for (const track of held) keep.add(track.id)
  for (const track of seeds) keep.add(track.id)
  return keep
}

/**
 * Catalog first, then bundled songs the catalog does not include.
 * A smaller published library must not hide playlist songs.
 */
export function seedsForPlaylist(
  published: Track[] | null | undefined,
  bundled: Track[],
): Track[] {
  if (!published || published.length === 0) return bundled
  const seen = new Set(published.map((t) => t.id))
  return [...published, ...bundled.filter((t) => !seen.has(t.id))]
}

/** Remember every song a playlist still names as those songs leave the vault. */
export function retainPlaylistTracks(
  held: Track[],
  playlists: { trackIds: string[] }[],
  leaving: Track[],
): Track[] {
  let next = held
  for (const track of leaving) {
    next = holdRemovedTrack(next, playlists, track)
  }
  return next
}

/**
 * Vault tracks plus snapshots playlists still name.
 * Publish uses this so a list is not dropped when its songs left the vault.
 */
export function tracksForPlaylistPublish(
  library: Track[],
  held: Track[],
  playlists: { trackIds: string[] }[],
): Track[] {
  const referenced = new Set(playlists.flatMap((p) => p.trackIds))
  const seen = new Set(library.map((t) => t.id))
  const extra = held.filter((t) => referenced.has(t.id) && !seen.has(t.id))
  return [...library, ...extra]
}
