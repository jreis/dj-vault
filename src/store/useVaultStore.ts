import { create } from "zustand"
import { persist } from "zustand/middleware"
import {
  ensureSeedTracks,
  ensureTrackBPMs,
  repairDeadYoutubeIds,
  SEED_TRACKS,
} from "../data/seedTracks"
import { SEED_PLAYLISTS } from "../data/seedPlaylists"
import { replaceCuratedPlaylists } from "../../functions/_lib/seedCatalog"
import type { PublishedCatalog } from "../lib/seedApi"
import { estimateBPM } from "../lib/bpm"
import { resumeActiveYtPlayer } from "../lib/youtubeApi"
import { songIdentity, uniqueSongs } from "../lib/youtubeDiscover.ts"
import type { Filters, Genre, Playlist, Track } from "../types"

/** YouTube discovery result ready to become a guest (or existing) vault track. */
export interface DiscoveredTrackInput {
  youtubeId: string
  title: string
  artist: string
  genre: Genre
  era: Track["era"]
  year: number
  notes?: string
}

function uid(prefix = "t"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function trackFromInput(input: DiscoveredTrackInput, id?: string): Track {
  const title = input.title.trim()
  const artist = input.artist.trim()
  const notes = input.notes?.trim() ?? ""
  const addedAt = new Date().toISOString()
  const draft: Track = {
    id: id ?? uid("t"),
    title,
    artist,
    youtubeId: input.youtubeId,
    genre: input.genre,
    era: input.era,
    year: input.year,
    score: 0,
    notes,
    addedAt,
  }
  return { ...draft, bpm: estimateBPM(draft) }
}

/** Drop a leftover preview once now-playing has moved on. */
function previewIfCurrent(
  preview: Track | null,
  nowPlayingId: string | null,
): Track | null {
  return preview && preview.id === nowPlayingId ? preview : null
}

function prunePlaylistIds(
  playlists: Playlist[],
  trackIds: Set<string>,
): Playlist[] {
  return playlists.map((p) => ({
    ...p,
    trackIds: p.trackIds.filter((id) => trackIds.has(id)),
  }))
}

interface VaultState {
  tracks: Track[]
  /** Named sets of library track ids (persisted). */
  playlists: Playlist[]
  /**
   * Tracks from a shared link that are not (yet) in the library.
   * Ephemeral — not persisted. Used so open-link can play immediately.
   */
  guestTracks: Track[]
  guestSetName: string | null
  /**
   * Ephemeral now-playing track from YouTube search, not in the library.
   * Replaced on each preview; dropped when playback moves on. Not persisted.
   */
  previewTrack: Track | null
  queue: string[]
  nowPlayingId: string | null
  selectedId: string | null
  filters: Filters
  darkMode: boolean
  showAddForm: boolean
  /** Fullscreen live-set view for demos and gigs. */
  setMode: boolean
  /** When set, SimilarTracks panel is open for this track id. */
  similarToId: string | null
  /**
   * Vault-search query the user asked to look up on YouTube.
   * Transient — not persisted. Cleared when filters reset.
   */
  youtubeSearchQuery: string | null
  /** Bumped on each explicit YouTube search so the same query can retry. */
  youtubeSearchSeq: number
  /**
   * When true, the YouTube search panel should start playing the best-of
   * set as soon as results arrive (artist-name searches).
   */
  youtubePlayBestOf: boolean
  /**
   * Live published seed catalog from GET /api/seed.
   * Transient — not persisted. Null means use bundled SEED_TRACKS.
   */
  publishedSeeds: Track[] | null
  /**
   * Live published starter playlists from GET /api/seed.
   * Transient — not persisted. Null means use bundled SEED_PLAYLISTS.
   */
  publishedPlaylists: Playlist[] | null
  /**
   * True when this browser had no persisted library yet, so the first
   * published catalog should replace the bundled default instead of merging.
   */
  awaitingPublishedSeeds: boolean

  // track ops
  addTrack: (input: DiscoveredTrackInput) => Track
  /**
   * Add discovered YouTube videos as ephemeral guest tracks (not persisted).
   * Returns resolved ids (existing library/guest id if the video is already known).
   */
  ingestDiscoveredTracks: (inputs: DiscoveredTrackInput[]) => string[]
  /**
   * Play a YouTube search result without adding it to the library.
   * If the video is already in the library or guest set, plays that track.
   */
  playPreview: (input: DiscoveredTrackInput) => Track
  /** Promote the current preview into the library, keeping playback on it. */
  addPreviewToVault: () => Track | null
  removeTrack: (id: string) => void
  vote: (id: string, delta: 1 | -1) => void
  updateNotes: (id: string, notes: string) => void
  resetToSeed: () => void
  /** Empty the library and stop playback. Persists; seeds are not re-injected. */
  clearLibrary: () => void
  /** Adopt a password-published catalog (live site) or bundled seeds. */
  applyPublishedSeeds: (catalog: PublishedCatalog | null) => void
  importTracks: (tracks: Track[], mode: "merge" | "replace") => void

  // guest / shared set
  /** Load a shared set and start playing without touching the library. */
  loadGuestSet: (tracks: Track[], name?: string | null) => void
  clearGuestSet: () => void
  /** Import guest tracks into library (merge/replace) and remap playback ids. */
  importGuestSet: (mode: "merge" | "replace") => void
  /** Save guest tracks as a named playlist (imports missing tracks first). */
  saveGuestAsPlaylist: (name: string) => Playlist | null

  // named playlists
  saveQueueAsPlaylist: (name: string, description?: string) => Playlist | null
  createPlaylist: (name: string, trackIds: string[], description?: string) => Playlist
  renamePlaylist: (id: string, name: string) => void
  updatePlaylistDescription: (id: string, description: string) => void
  deletePlaylist: (id: string) => void
  updatePlaylistTracks: (id: string, trackIds: string[]) => void
  addTrackToPlaylist: (playlistId: string, trackId: string) => void
  playPlaylist: (id: string) => void
  exportPlaylists: () => string
  importPlaylists: (json: string) => boolean
  /** Resolve track from library, guest session, or active preview. */
  resolveTrack: (id: string) => Track | undefined

  // playback
  play: (id: string) => void
  stop: () => void
  enqueue: (id: string) => void
  /** Insert at front of queue (play next). Moves if already queued. */
  enqueueNext: (id: string) => void
  enqueueMany: (ids: string[]) => void
  /** Insert many at front of queue, preserving order (first id plays next). */
  enqueueManyNext: (ids: string[]) => void
  dequeue: (id: string) => void
  clearQueue: () => void
  moveQueue: (id: string, direction: -1 | 1) => void
  /** Play first id now; remaining become the queue (multi-track set). */
  playSet: (ids: string[]) => void
  playNext: () => void
  playPrev: () => void

  // selection / filters
  select: (id: string | null) => void
  selectRelative: (delta: number, visibleIds: string[]) => void
  setFilters: (partial: Partial<Filters>) => void
  clearFilters: () => void
  setShowAddForm: (open: boolean) => void
  setSimilarTo: (id: string | null) => void
  /** Search YouTube for `query`, or the current vault search if omitted. */
  requestYoutubeSearch: (query?: string, opts?: { playBestOf?: boolean }) => void
  clearYoutubeSearch: () => void
  /**
   * Add YouTube discoveries to the library, save them as a named playlist
   * (replacing one with the same name), and start playing that set.
   */
  playArtistBestOf: (
    name: string,
    extraVaultIds: string[],
    discoveries: DiscoveredTrackInput[],
  ) => Playlist | null
  setSetMode: (open: boolean) => void
  toggleSetMode: () => void
  toggleDarkMode: () => void
}

export const defaultFilters: Filters = {
  query: "",
  genre: "All",
  era: "All",
  sortKey: "score",
  sortDir: "desc",
}

/** Library + guest + preview tracks for playback resolution. */
export function selectPlaybackTracks(s: {
  tracks: Track[]
  guestTracks: Track[]
  previewTrack?: Track | null
}): Track[] {
  if (s.guestTracks.length === 0 && !s.previewTrack) return s.tracks
  const byId = new Map(s.tracks.map((t) => [t.id, t]))
  for (const g of s.guestTracks) {
    if (!byId.has(g.id)) byId.set(g.id, g)
  }
  if (s.previewTrack && !byId.has(s.previewTrack.id)) {
    byId.set(s.previewTrack.id, s.previewTrack)
  }
  return [...byId.values()]
}

function currentSetIds(s: {
  nowPlayingId: string | null
  queue: string[]
}): string[] {
  const ids = [
    ...(s.nowPlayingId ? [s.nowPlayingId] : []),
    ...s.queue.filter((id) => id !== s.nowPlayingId),
  ]
  return ids
}

export const useVaultStore = create<VaultState>()(
  persist(
    (set, get) => ({
      tracks: SEED_TRACKS,
      playlists: [],
      guestTracks: [],
      guestSetName: null,
      previewTrack: null,
      queue: [],
      nowPlayingId: null,
      selectedId: SEED_TRACKS[0]?.id ?? null,
      filters: defaultFilters,
      darkMode: true,
      showAddForm: false,
      setMode: false,
      similarToId: null,
      youtubeSearchQuery: null,
      youtubeSearchSeq: 0,
      youtubePlayBestOf: false,
      publishedSeeds: null,
      publishedPlaylists: null,
      awaitingPublishedSeeds: false,

      resolveTrack: (id) => {
        const s = get()
        return (
          s.tracks.find((t) => t.id === id) ??
          s.guestTracks.find((t) => t.id === id) ??
          (s.previewTrack?.id === id ? s.previewTrack : undefined)
        )
      },

      addTrack: (input) => {
        const preview = get().previewTrack
        const reusePreview =
          preview !== null && preview.youtubeId === input.youtubeId
        const track = trackFromInput(
          input,
          reusePreview ? preview.id : undefined,
        )
        set((s) => {
          const wasPreview =
            s.previewTrack !== null &&
            s.previewTrack.youtubeId === track.youtubeId
          const previewId = s.previewTrack?.id
          return {
            tracks: [track, ...s.tracks],
            selectedId: track.id,
            showAddForm: false,
            previewTrack: wasPreview ? null : s.previewTrack,
            nowPlayingId:
              wasPreview && previewId && s.nowPlayingId === previewId
                ? track.id
                : s.nowPlayingId,
            queue:
              wasPreview && previewId
                ? s.queue.map((id) => (id === previewId ? track.id : id))
                : s.queue,
          }
        })
        return track
      },

      removeTrack: (id) => {
        set((s) => {
          const tracks = s.tracks.filter((t) => t.id !== id)
          const trackIds = new Set(tracks.map((t) => t.id))
          return {
            tracks,
            queue: s.queue.filter((q) => q !== id),
            nowPlayingId: s.nowPlayingId === id ? null : s.nowPlayingId,
            selectedId: s.selectedId === id ? null : s.selectedId,
            similarToId: s.similarToId === id ? null : s.similarToId,
            playlists: prunePlaylistIds(s.playlists, trackIds),
            guestTracks: s.guestTracks.filter((t) => t.id !== id),
          }
        })
      },

      vote: (id, delta) => {
        set((s) => ({
          tracks: s.tracks.map((t) =>
            t.id === id ? { ...t, score: t.score + delta } : t,
          ),
          guestTracks: s.guestTracks.map((t) =>
            t.id === id ? { ...t, score: t.score + delta } : t,
          ),
        }))
      },

      updateNotes: (id, notes) => {
        set((s) => ({
          tracks: s.tracks.map((t) => (t.id === id ? { ...t, notes } : t)),
          guestTracks: s.guestTracks.map((t) =>
            t.id === id ? { ...t, notes } : t,
          ),
        }))
      },

      resetToSeed: () => {
        const seeds = get().publishedSeeds ?? SEED_TRACKS
        const playlists = get().publishedPlaylists ?? SEED_PLAYLISTS
        set({
          tracks: seeds,
          playlists,
          guestTracks: [],
          guestSetName: null,
          previewTrack: null,
          queue: [],
          nowPlayingId: null,
          selectedId: seeds[0]?.id ?? null,
          filters: defaultFilters,
          similarToId: null,
          setMode: false,
          awaitingPublishedSeeds: false,
        })
      },

      clearLibrary: () => {
        set((s) => ({
          tracks: [],
          playlists: prunePlaylistIds(s.playlists, new Set()),
          guestTracks: [],
          guestSetName: null,
          previewTrack: null,
          queue: [],
          nowPlayingId: null,
          selectedId: null,
          similarToId: null,
          setMode: false,
          awaitingPublishedSeeds: false,
        }))
      },

      applyPublishedSeeds: (catalog) => {
        if (!catalog || catalog.tracks.length === 0) {
          set({ awaitingPublishedSeeds: false })
          return
        }
        const seedTracks = ensureTrackBPMs(catalog.tracks)
        const seedTrackIds = new Set(seedTracks.map((t) => t.id))
        const publishedPlaylists =
          catalog.playlists == null
            ? null
            : prunePlaylistIds(
                catalog.playlists.map((p) => ({ ...p, curated: true })),
                seedTrackIds,
              ).filter((p) => p.trackIds.length > 0)
        set((s) => {
          const playlists = replaceCuratedPlaylists(
            s.playlists,
            publishedPlaylists,
          )
          if (s.awaitingPublishedSeeds) {
            return {
              publishedSeeds: seedTracks,
              publishedPlaylists: publishedPlaylists ?? SEED_PLAYLISTS,
              awaitingPublishedSeeds: false,
              tracks: seedTracks,
              playlists: publishedPlaylists ?? SEED_PLAYLISTS,
              selectedId: seedTracks[0]?.id ?? s.selectedId,
            }
          }
          // An intentionally empty vault stays empty; Reset seed still uses catalog.
          if (s.tracks.length === 0) {
            return {
              publishedSeeds: seedTracks,
              publishedPlaylists: publishedPlaylists ?? s.publishedPlaylists,
              awaitingPublishedSeeds: false,
              playlists,
            }
          }
          return {
            publishedSeeds: seedTracks,
            publishedPlaylists: publishedPlaylists ?? s.publishedPlaylists,
            awaitingPublishedSeeds: false,
            tracks: ensureTrackBPMs(
              ensureSeedTracks(repairDeadYoutubeIds(s.tracks), seedTracks),
            ),
            playlists,
          }
        })
      },

      importTracks: (tracks, mode) => {
        const tracksWithBPM = ensureTrackBPMs(tracks)
        if (mode === "replace") {
          const trackIds = new Set(tracksWithBPM.map((t) => t.id))
          set((s) => ({
            tracks: tracksWithBPM,
            queue: [],
            nowPlayingId: null,
            selectedId: tracksWithBPM[0]?.id ?? null,
            playlists: prunePlaylistIds(s.playlists, trackIds),
            guestTracks: [],
            guestSetName: null,
            previewTrack: null,
          }))
          return
        }
        set((s) => {
          const existingIds = new Set(s.tracks.map((t) => t.id))
          const existingYt = new Set(s.tracks.map((t) => t.youtubeId))
          const merged = [
            ...s.tracks,
            ...tracksWithBPM.filter(
              (t) => !existingIds.has(t.id) && !existingYt.has(t.youtubeId),
            ),
          ]
          return { tracks: merged }
        })
      },

      loadGuestSet: (tracks, name) => {
        if (tracks.length === 0) return
        const tracksWithBPM = ensureTrackBPMs(tracks)
        const ids = tracksWithBPM.map((t) => t.id)
        const [first, ...rest] = ids
        set({
          guestTracks: tracksWithBPM,
          guestSetName: name?.trim() || null,
          previewTrack: null,
          nowPlayingId: first,
          selectedId: first,
          queue: rest,
          setMode: tracks.length > 1,
        })
      },

      clearGuestSet: () => {
        set((s) => {
          const guestIds = new Set(s.guestTracks.map((t) => t.id))
          const nowPlayingId =
            s.nowPlayingId && guestIds.has(s.nowPlayingId)
              ? null
              : s.nowPlayingId
          const queue = s.queue.filter((id) => !guestIds.has(id))
          return {
            guestTracks: [],
            guestSetName: null,
            nowPlayingId,
            queue,
            setMode: nowPlayingId || queue.length ? s.setMode : false,
          }
        })
      },

      importGuestSet: (mode) => {
        const { guestTracks } = get()
        if (guestTracks.length === 0) return

        if (mode === "replace") {
          set({
            tracks: guestTracks,
            playlists: [],
            queue: guestTracks.slice(1).map((t) => t.id),
            nowPlayingId: guestTracks[0]?.id ?? null,
            selectedId: guestTracks[0]?.id ?? null,
            guestTracks: [],
            guestSetName: null,
          })
          return
        }

        // Merge by youtubeId; remap playback to library ids.
        set((s) => {
          const byYt = new Map(s.tracks.map((t) => [t.youtubeId, t]))
          const idMap = new Map<string, string>()
          const toAdd: Track[] = []

          for (const g of guestTracks) {
            const existing = byYt.get(g.youtubeId)
            if (existing) {
              idMap.set(g.id, existing.id)
            } else {
              toAdd.push(g)
              idMap.set(g.id, g.id)
              byYt.set(g.youtubeId, g)
            }
          }

          const mapId = (id: string) => idMap.get(id) ?? id
          const nowPlayingId = s.nowPlayingId
            ? mapId(s.nowPlayingId)
            : null
          const queue = s.queue.map(mapId)

          return {
            tracks: [...s.tracks, ...toAdd],
            nowPlayingId,
            queue,
            selectedId: nowPlayingId,
            guestTracks: [],
            guestSetName: null,
          }
        })
      },

      saveGuestAsPlaylist: (name) => {
        const trimmed = name.trim().slice(0, 80)
        if (!trimmed) return null
        const { guestTracks } = get()
        if (guestTracks.length === 0) return null

        // Snapshot order before merge clears guestTracks.
        const ytOrder = guestTracks.map((g) => g.youtubeId)
        get().importGuestSet("merge")
        const ytToId = new Map(get().tracks.map((t) => [t.youtubeId, t.id]))
        const trackIds = ytOrder
          .map((yt) => ytToId.get(yt))
          .filter((id): id is string => Boolean(id))

        if (trackIds.length === 0) return null
        return get().createPlaylist(trimmed, trackIds)
      },

      saveQueueAsPlaylist: (name, description) => {
        const trimmed = name.trim().slice(0, 80)
        if (!trimmed) return null
        const s = get()
        // Prefer library-only ids so playlists stay stable after guest clear.
        const ids = currentSetIds(s).filter((id) =>
          s.tracks.some((t) => t.id === id),
        )
        if (ids.length === 0) return null
        return get().createPlaylist(trimmed, ids, description)
      },

      createPlaylist: (name, trackIds, description) => {
        const now = new Date().toISOString()
        const playlist: Playlist = {
          id: uid("pl"),
          name: name.trim().slice(0, 80) || "Untitled",
          description: description?.trim() || undefined,
          trackIds: [...new Set(trackIds)],
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({ playlists: [playlist, ...s.playlists] }))
        return playlist
      },

      renamePlaylist: (id, name) => {
        const trimmed = name.trim().slice(0, 80)
        if (!trimmed) return
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === id
              ? { ...p, name: trimmed, updatedAt: new Date().toISOString() }
              : p,
          ),
        }))
      },

      updatePlaylistDescription: (id, description) => {
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === id
              ? {
                  ...p,
                  description: description.trim() || undefined,
                  updatedAt: new Date().toISOString(),
                }
              : p,
          ),
        }))
      },

      deletePlaylist: (id) => {
        set((s) => ({
          playlists: s.playlists.filter((p) => p.id !== id),
        }))
      },

      exportPlaylists: () => {
        const s = get()
        const data = {
          version: 1,
          exportedAt: new Date().toISOString(),
          playlists: s.playlists.map((pl) => ({
            ...pl,
            tracks: pl.trackIds
              .map((id) => s.tracks.find((t) => t.id === id))
              .filter((t): t is Track => Boolean(t)),
          })),
        }
        return JSON.stringify(data, null, 2)
      },

      importPlaylists: (json) => {
        try {
          const data = JSON.parse(json) as {
            version: number
            playlists: Array<
              Playlist & { tracks?: Track[] }
            >
          }
          if (!data.playlists || !Array.isArray(data.playlists)) return false

          set((s) => {
            const newPlaylists: Playlist[] = []
            const tracksToAdd: Track[] = []
            const existingYoutubeIds = new Set(
              s.tracks.map((t) => t.youtubeId),
            )

            for (const pl of data.playlists) {
              // Import tracks if they don't exist
              const trackIds: string[] = []
              if (pl.tracks && Array.isArray(pl.tracks)) {
                for (const track of pl.tracks) {
                  const existing = s.tracks.find(
                    (t) => t.youtubeId === track.youtubeId,
                  )
                  if (existing) {
                    trackIds.push(existing.id)
                  } else if (!existingYoutubeIds.has(track.youtubeId)) {
                    const newTrack = { ...track, id: uid("t") }
                    tracksToAdd.push(newTrack)
                    trackIds.push(newTrack.id)
                    existingYoutubeIds.add(track.youtubeId)
                  }
                }
              } else {
                // Just track IDs, keep what exists
                trackIds.push(
                  ...pl.trackIds.filter((id) =>
                    s.tracks.some((t) => t.id === id),
                  ),
                )
              }

              if (trackIds.length > 0) {
                newPlaylists.push({
                  id: uid("pl"),
                  name: pl.name,
                  description: pl.description,
                  trackIds,
                  createdAt: pl.createdAt || new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                })
              }
            }

            return {
              playlists: [...newPlaylists, ...s.playlists],
              tracks: ensureTrackBPMs([...tracksToAdd, ...s.tracks]),
            }
          })
          return true
        } catch {
          return false
        }
      },

      updatePlaylistTracks: (id, trackIds) => {
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === id
              ? {
                  ...p,
                  trackIds: [...new Set(trackIds)],
                  updatedAt: new Date().toISOString(),
                }
              : p,
          ),
        }))
      },

      addTrackToPlaylist: (playlistId, trackId) => {
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === playlistId && !p.curated
              ? {
                  ...p,
                  trackIds: [...new Set([...p.trackIds, trackId])],
                  updatedAt: new Date().toISOString(),
                }
              : p,
          ),
        }))
      },

      playPlaylist: (id) => {
        const p = get().playlists.find((x) => x.id === id)
        if (!p || p.trackIds.length === 0) return
        const valid = p.trackIds.filter((tid) =>
          get().tracks.some((t) => t.id === tid),
        )
        if (valid.length === 0) return
        get().playSet(valid)
      },

      playArtistBestOf: (name, extraVaultIds, discoveries) => {
        const trimmed = name.trim().slice(0, 80)
        if (!trimmed) return null
        const s = get()
        const byYt = new Map(s.tracks.map((t) => [t.youtubeId, t]))
        const bySong = new Map(
          s.tracks.map((t) => [songIdentity(t.title, t.artist), t]),
        )
        const ids: string[] = []
        const toAdd: Track[] = []
        const seen = new Set<string>()

        for (const input of uniqueSongs(discoveries)) {
          const key = songIdentity(input.title, input.artist)
          if (seen.has(key)) continue
          const existing = byYt.get(input.youtubeId) ?? bySong.get(key)
          if (existing) {
            seen.add(key)
            if (!ids.includes(existing.id)) ids.push(existing.id)
            continue
          }
          const track = trackFromInput(input)
          toAdd.push(track)
          byYt.set(track.youtubeId, track)
          bySong.set(key, track)
          seen.add(key)
          ids.push(track.id)
        }

        for (const id of extraVaultIds) {
          const extra = s.tracks.find((t) => t.id === id)
          if (!extra || ids.includes(id)) continue
          const key = songIdentity(extra.title, extra.artist)
          if (seen.has(key)) continue
          seen.add(key)
          ids.push(id)
        }

        if (ids.length === 0) {
          set({ youtubePlayBestOf: false })
          return null
        }

        const now = new Date().toISOString()
        const existingPl = s.playlists.find(
          (p) => !p.curated && p.name === trimmed,
        )
        const playlist: Playlist = existingPl
          ? { ...existingPl, trackIds: ids, updatedAt: now }
          : {
              id: uid("pl"),
              name: trimmed,
              trackIds: ids,
              createdAt: now,
              updatedAt: now,
            }
        const playlists = existingPl
          ? s.playlists.map((p) => (p.id === existingPl.id ? playlist : p))
          : [playlist, ...s.playlists]

        const [first, ...rest] = ids
        set({
          tracks: ensureTrackBPMs([...s.tracks, ...toAdd]),
          playlists,
          guestTracks: [],
          guestSetName: null,
          previewTrack: null,
          nowPlayingId: first,
          selectedId: first,
          queue: rest,
          youtubePlayBestOf: false,
        })
        return playlist
      },

      ingestDiscoveredTracks: (inputs) => {
        if (inputs.length === 0) return []
        const s = get()
        const byYt = new Map<string, Track>()
        for (const t of s.tracks) byYt.set(t.youtubeId, t)
        for (const t of s.guestTracks) byYt.set(t.youtubeId, t)

        const resolved: string[] = []
        const newGuests: Track[] = []

        const bySong = new Map<string, Track>()
        for (const t of byYt.values()) {
          bySong.set(songIdentity(t.title, t.artist), t)
        }
        const seen = new Set<string>()

        for (const input of uniqueSongs(inputs)) {
          const key = songIdentity(input.title, input.artist)
          if (seen.has(key)) continue
          const existing = byYt.get(input.youtubeId) ?? bySong.get(key)
          if (existing) {
            seen.add(key)
            resolved.push(existing.id)
            continue
          }
          const track = trackFromInput(input, uid("g"))
          newGuests.push(track)
          byYt.set(track.youtubeId, track)
          bySong.set(key, track)
          seen.add(key)
          resolved.push(track.id)
        }

        if (newGuests.length > 0) {
          set({ guestTracks: [...s.guestTracks, ...newGuests] })
        }
        return resolved
      },

      playPreview: (input) => {
        const s = get()
        const known =
          s.tracks.find((t) => t.youtubeId === input.youtubeId) ??
          s.guestTracks.find((t) => t.youtubeId === input.youtubeId) ??
          (s.previewTrack?.youtubeId === input.youtubeId
            ? s.previewTrack
            : undefined)
        if (known) {
          get().play(known.id)
          return known
        }
        const track = trackFromInput(input)
        set({
          previewTrack: track,
          nowPlayingId: track.id,
          selectedId: track.id,
        })
        return track
      },

      addPreviewToVault: () => {
        const preview = get().previewTrack
        if (!preview) return null
        return get().addTrack({
          title: preview.title,
          artist: preview.artist,
          youtubeId: preview.youtubeId,
          genre: preview.genre,
          era: preview.era,
          year: preview.year,
          notes: preview.notes,
        })
      },

      play: (id) => {
        const prev = get().nowPlayingId
        const preview = get().previewTrack
        set({
          nowPlayingId: id,
          selectedId: id,
          previewTrack: previewIfCurrent(preview, id),
        })
        // Same track is already mounted — resume in this click so autoplay
        // policies treat it as a user gesture (Start Radio, Play on current).
        if (prev === id) {
          resumeActiveYtPlayer()
        }
      },
      stop: () =>
        set({ nowPlayingId: null, setMode: false, previewTrack: null }),

      enqueue: (id) => {
        set((s) => (s.queue.includes(id) ? s : { queue: [...s.queue, id] }))
      },

      enqueueNext: (id) => {
        set((s) => {
          if (s.nowPlayingId === id) return s
          const rest = s.queue.filter((q) => q !== id)
          return { queue: [id, ...rest] }
        })
      },

      enqueueMany: (ids) => {
        set((s) => {
          const seen = new Set(s.queue)
          if (s.nowPlayingId) seen.add(s.nowPlayingId)
          const next = [...s.queue]
          for (const id of ids) {
            if (!seen.has(id)) {
              seen.add(id)
              next.push(id)
            }
          }
          return { queue: next }
        })
      },

      enqueueManyNext: (ids) => {
        set((s) => {
          const front: string[] = []
          const seen = new Set<string>()
          if (s.nowPlayingId) seen.add(s.nowPlayingId)
          for (const id of ids) {
            if (!seen.has(id)) {
              seen.add(id)
              front.push(id)
            }
          }
          if (front.length === 0) return s
          const remaining = s.queue.filter((q) => !front.includes(q))
          return { queue: [...front, ...remaining] }
        })
      },

      dequeue: (id) => {
        set((s) => ({ queue: s.queue.filter((q) => q !== id) }))
      },

      clearQueue: () => set({ queue: [] }),

      moveQueue: (id, direction) => {
        set((s) => {
          const idx = s.queue.indexOf(id)
          if (idx < 0) return s
          const swap = idx + direction
          if (swap < 0 || swap >= s.queue.length) return s
          const queue = [...s.queue]
          ;[queue[idx], queue[swap]] = [queue[swap], queue[idx]]
          return { queue }
        })
      },

      playSet: (ids) => {
        if (ids.length === 0) return
        const [first, ...rest] = ids
        set({
          nowPlayingId: first,
          selectedId: first,
          queue: rest,
          previewTrack: previewIfCurrent(get().previewTrack, first),
          // Multi-track sets open the live view — best demo moment.
          setMode: ids.length > 1,
        })
      },

      playNext: () => {
        const { queue, nowPlayingId, previewTrack } = get()
        const tracks = selectPlaybackTracks(get())
        if (queue.length > 0) {
          const [next, ...rest] = queue
          set({
            nowPlayingId: next,
            selectedId: next,
            queue: rest,
            previewTrack: previewIfCurrent(previewTrack, next),
          })
          return
        }
        const sorted = [...tracks].sort((a, b) => b.score - a.score)
        if (!nowPlayingId) {
          if (sorted[0])
            set({
              nowPlayingId: sorted[0].id,
              selectedId: sorted[0].id,
              previewTrack: previewIfCurrent(previewTrack, sorted[0].id),
            })
          return
        }
        const idx = sorted.findIndex((t) => t.id === nowPlayingId)
        const next = sorted[idx + 1] ?? sorted[0]
        if (next)
          set({
            nowPlayingId: next.id,
            selectedId: next.id,
            previewTrack: previewIfCurrent(previewTrack, next.id),
          })
      },

      playPrev: () => {
        const { nowPlayingId, previewTrack } = get()
        const tracks = selectPlaybackTracks(get())
        const sorted = [...tracks].sort((a, b) => b.score - a.score)
        if (!nowPlayingId) {
          if (sorted[0])
            set({
              nowPlayingId: sorted[0].id,
              selectedId: sorted[0].id,
              previewTrack: previewIfCurrent(previewTrack, sorted[0].id),
            })
          return
        }
        const idx = sorted.findIndex((t) => t.id === nowPlayingId)
        const prev = sorted[idx - 1] ?? sorted[sorted.length - 1]
        if (prev)
          set({
            nowPlayingId: prev.id,
            selectedId: prev.id,
            previewTrack: previewIfCurrent(previewTrack, prev.id),
          })
      },

      select: (id) => set({ selectedId: id }),

      selectRelative: (delta, visibleIds) => {
        if (visibleIds.length === 0) return
        const { selectedId } = get()
        const idx = selectedId ? visibleIds.indexOf(selectedId) : -1
        let next = idx + delta
        if (next < 0) next = visibleIds.length - 1
        if (next >= visibleIds.length) next = 0
        set({ selectedId: visibleIds[next] })
      },

      setFilters: (partial) => {
        set((s) => {
          const filters = { ...s.filters, ...partial }
          const queryChanged =
            partial.query !== undefined &&
            partial.query.trim() !== (s.youtubeSearchQuery ?? "")
          return {
            filters,
            ...(queryChanged ? { youtubeSearchQuery: null } : {}),
          }
        })
      },

      clearFilters: () => {
        set((s) => ({
          filters: {
            ...defaultFilters,
            sortKey: s.filters.sortKey,
            sortDir: s.filters.sortDir,
          },
          youtubeSearchQuery: null,
        }))
      },

      setShowAddForm: (open) => set({ showAddForm: open }),

      setSimilarTo: (id) => set({ similarToId: id }),

      requestYoutubeSearch: (query, opts) => {
        const q = (query ?? get().filters.query).trim()
        if (!q) return
        set((s) => ({
          youtubeSearchQuery: q,
          youtubeSearchSeq: s.youtubeSearchSeq + 1,
          youtubePlayBestOf: Boolean(opts?.playBestOf),
          filters: { ...s.filters, query: q },
        }))
      },

      clearYoutubeSearch: () =>
        set({ youtubeSearchQuery: null, youtubePlayBestOf: false }),

      setSetMode: (open) => set({ setMode: open }),

      toggleSetMode: () => set((s) => ({ setMode: !s.setMode })),

      toggleDarkMode: () => {
        set((s) => {
          const darkMode = !s.darkMode
          document.documentElement.classList.toggle("dark", darkMode)
          document.documentElement.classList.toggle("light", !darkMode)
          return { darkMode }
        })
      },
    }),
    {
      name: "dj-vault-v1",
      // Persist library + playlists + current track (and related UI prefs).
      // Guest sets, previews, and transient UI are intentionally omitted.
      partialize: (s) => ({
        tracks: s.tracks,
        playlists: s.playlists,
        nowPlayingId: s.nowPlayingId,
        queue: s.queue,
        darkMode: s.darkMode,
        filters: s.filters,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<VaultState>
        const tracksPersisted = Array.isArray(p.tracks)
        const rawTracks = tracksPersisted ? p.tracks! : current.tracks
        // Empty persisted library is intentional — do not re-inject seeds.
        const tracks = ensureTrackBPMs(
          rawTracks.length === 0
            ? rawTracks
            : ensureSeedTracks(repairDeadYoutubeIds(rawTracks)),
        )

        const trackIds = new Set(tracks.map((t) => t.id))
        const nowPlayingId =
          p.nowPlayingId && trackIds.has(p.nowPlayingId)
            ? p.nowPlayingId
            : null
        const queue = Array.isArray(p.queue)
          ? p.queue.filter((id) => trackIds.has(id))
          : current.queue

        const userPlaylists = Array.isArray(p.playlists)
          ? prunePlaylistIds(
              p.playlists.filter(
                (pl): pl is Playlist =>
                  Boolean(pl) &&
                  typeof pl.id === "string" &&
                  typeof pl.name === "string" &&
                  Array.isArray(pl.trackIds),
              ),
              trackIds,
            )
          : []

        // Load Jason's curated playlists if user has no playlists yet
        const playlists = userPlaylists.length === 0
          ? [...SEED_PLAYLISTS, ...userPlaylists]
          : userPlaylists

        return {
          ...current,
          ...p,
          tracks,
          playlists,
          guestTracks: [],
          guestSetName: null,
          previewTrack: null,
          youtubePlayBestOf: false,
          publishedSeeds: null,
          publishedPlaylists: null,
          awaitingPublishedSeeds: !tracksPersisted,
          nowPlayingId,
          queue,
          filters: p.filters
            ? { ...current.filters, ...p.filters }
            : current.filters,
          darkMode:
            typeof p.darkMode === "boolean" ? p.darkMode : current.darkMode,
        }
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return
        document.documentElement.classList.toggle("dark", state.darkMode)
        document.documentElement.classList.toggle("light", !state.darkMode)
      },
    },
  ),
)
