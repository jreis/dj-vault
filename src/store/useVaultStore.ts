import { create } from "zustand"
import { persist } from "zustand/middleware"
import {
  ensureSeedTracks,
  repairDeadYoutubeIds,
  SEED_TRACKS,
} from "../data/seedTracks"
import type { Filters, Genre, Playlist, Track } from "../types"

function uid(prefix = "t"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
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

  // track ops
  addTrack: (input: {
    title: string
    artist: string
    youtubeId: string
    genre: Genre
    era: Track["era"]
    year: number
    notes?: string
  }) => Track
  removeTrack: (id: string) => void
  vote: (id: string, delta: 1 | -1) => void
  updateNotes: (id: string, notes: string) => void
  resetToSeed: () => void
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
  saveQueueAsPlaylist: (name: string) => Playlist | null
  createPlaylist: (name: string, trackIds: string[]) => Playlist
  renamePlaylist: (id: string, name: string) => void
  deletePlaylist: (id: string) => void
  updatePlaylistTracks: (id: string, trackIds: string[]) => void
  playPlaylist: (id: string) => void
  /** Resolve track from library or guest session. */
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

/** Library + guest tracks for playback resolution. */
export function selectPlaybackTracks(s: {
  tracks: Track[]
  guestTracks: Track[]
}): Track[] {
  if (s.guestTracks.length === 0) return s.tracks
  const byId = new Map(s.tracks.map((t) => [t.id, t]))
  for (const g of s.guestTracks) {
    if (!byId.has(g.id)) byId.set(g.id, g)
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
      queue: [],
      nowPlayingId: null,
      selectedId: SEED_TRACKS[0]?.id ?? null,
      filters: defaultFilters,
      darkMode: true,
      showAddForm: false,
      setMode: false,
      similarToId: null,

      resolveTrack: (id) => {
        const s = get()
        return (
          s.tracks.find((t) => t.id === id) ??
          s.guestTracks.find((t) => t.id === id)
        )
      },

      addTrack: (input) => {
        const track: Track = {
          id: uid("t"),
          title: input.title.trim(),
          artist: input.artist.trim(),
          youtubeId: input.youtubeId,
          genre: input.genre,
          era: input.era,
          year: input.year,
          score: 0,
          notes: input.notes?.trim() ?? "",
          addedAt: new Date().toISOString(),
        }
        set((s) => ({
          tracks: [track, ...s.tracks],
          selectedId: track.id,
          showAddForm: false,
        }))
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
        set({
          tracks: SEED_TRACKS,
          playlists: [],
          guestTracks: [],
          guestSetName: null,
          queue: [],
          nowPlayingId: null,
          selectedId: SEED_TRACKS[0]?.id ?? null,
          filters: defaultFilters,
        })
      },

      importTracks: (tracks, mode) => {
        if (mode === "replace") {
          const trackIds = new Set(tracks.map((t) => t.id))
          set((s) => ({
            tracks,
            queue: [],
            nowPlayingId: null,
            selectedId: tracks[0]?.id ?? null,
            playlists: prunePlaylistIds(s.playlists, trackIds),
            guestTracks: [],
            guestSetName: null,
          }))
          return
        }
        set((s) => {
          const existingIds = new Set(s.tracks.map((t) => t.id))
          const existingYt = new Set(s.tracks.map((t) => t.youtubeId))
          const merged = [
            ...s.tracks,
            ...tracks.filter(
              (t) => !existingIds.has(t.id) && !existingYt.has(t.youtubeId),
            ),
          ]
          return { tracks: merged }
        })
      },

      loadGuestSet: (tracks, name) => {
        if (tracks.length === 0) return
        const ids = tracks.map((t) => t.id)
        const [first, ...rest] = ids
        set({
          guestTracks: tracks,
          guestSetName: name?.trim() || null,
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

      saveQueueAsPlaylist: (name) => {
        const trimmed = name.trim().slice(0, 80)
        if (!trimmed) return null
        const s = get()
        // Prefer library-only ids so playlists stay stable after guest clear.
        const ids = currentSetIds(s).filter((id) =>
          s.tracks.some((t) => t.id === id),
        )
        if (ids.length === 0) return null
        return get().createPlaylist(trimmed, ids)
      },

      createPlaylist: (name, trackIds) => {
        const now = new Date().toISOString()
        const playlist: Playlist = {
          id: uid("pl"),
          name: name.trim().slice(0, 80) || "Untitled",
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

      deletePlaylist: (id) => {
        set((s) => ({
          playlists: s.playlists.filter((p) => p.id !== id),
        }))
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

      playPlaylist: (id) => {
        const p = get().playlists.find((x) => x.id === id)
        if (!p || p.trackIds.length === 0) return
        const valid = p.trackIds.filter((tid) =>
          get().tracks.some((t) => t.id === tid),
        )
        if (valid.length === 0) return
        get().playSet(valid)
      },

      play: (id) => set({ nowPlayingId: id, selectedId: id }),
      stop: () => set({ nowPlayingId: null, setMode: false }),

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
          // Multi-track sets open the live view — best demo moment.
          setMode: ids.length > 1,
        })
      },

      playNext: () => {
        const { queue, nowPlayingId } = get()
        const tracks = selectPlaybackTracks(get())
        if (queue.length > 0) {
          const [next, ...rest] = queue
          set({ nowPlayingId: next, selectedId: next, queue: rest })
          return
        }
        const sorted = [...tracks].sort((a, b) => b.score - a.score)
        if (!nowPlayingId) {
          if (sorted[0])
            set({ nowPlayingId: sorted[0].id, selectedId: sorted[0].id })
          return
        }
        const idx = sorted.findIndex((t) => t.id === nowPlayingId)
        const next = sorted[idx + 1] ?? sorted[0]
        if (next) set({ nowPlayingId: next.id, selectedId: next.id })
      },

      playPrev: () => {
        const { nowPlayingId } = get()
        const tracks = selectPlaybackTracks(get())
        const sorted = [...tracks].sort((a, b) => b.score - a.score)
        if (!nowPlayingId) {
          if (sorted[0])
            set({ nowPlayingId: sorted[0].id, selectedId: sorted[0].id })
          return
        }
        const idx = sorted.findIndex((t) => t.id === nowPlayingId)
        const prev = sorted[idx - 1] ?? sorted[sorted.length - 1]
        if (prev) set({ nowPlayingId: prev.id, selectedId: prev.id })
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
        set((s) => ({ filters: { ...s.filters, ...partial } }))
      },

      clearFilters: () => {
        set((s) => ({
          filters: {
            ...defaultFilters,
            sortKey: s.filters.sortKey,
            sortDir: s.filters.sortDir,
          },
        }))
      },

      setShowAddForm: (open) => set({ showAddForm: open }),

      setSimilarTo: (id) => set({ similarToId: id }),

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
      // Guest sets and transient UI are intentionally omitted.
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
        const rawTracks =
          Array.isArray(p.tracks) && p.tracks.length > 0
            ? p.tracks
            : current.tracks
        const tracks = ensureSeedTracks(repairDeadYoutubeIds(rawTracks))

        const trackIds = new Set(tracks.map((t) => t.id))
        const nowPlayingId =
          p.nowPlayingId && trackIds.has(p.nowPlayingId)
            ? p.nowPlayingId
            : null
        const queue = Array.isArray(p.queue)
          ? p.queue.filter((id) => trackIds.has(id))
          : current.queue

        const playlists = Array.isArray(p.playlists)
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
          : current.playlists

        return {
          ...current,
          ...p,
          tracks,
          playlists,
          guestTracks: [],
          guestSetName: null,
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
