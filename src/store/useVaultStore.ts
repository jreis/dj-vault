import { create } from "zustand"
import { persist } from "zustand/middleware"
import {
  ensureSeedTracks,
  repairDeadYoutubeIds,
  SEED_TRACKS,
} from "../data/seedTracks"
import type { Filters, Genre, Track } from "../types"

function uid(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

interface VaultState {
  tracks: Track[]
  queue: string[]
  nowPlayingId: string | null
  selectedId: string | null
  filters: Filters
  darkMode: boolean
  showAddForm: boolean
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
  }) => void
  removeTrack: (id: string) => void
  vote: (id: string, delta: 1 | -1) => void
  updateNotes: (id: string, notes: string) => void
  resetToSeed: () => void
  importTracks: (tracks: Track[], mode: "merge" | "replace") => void

  // playback
  play: (id: string) => void
  stop: () => void
  enqueue: (id: string) => void
  enqueueMany: (ids: string[]) => void
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
  toggleDarkMode: () => void
}

export const defaultFilters: Filters = {
  query: "",
  genre: "All",
  era: "All",
  sortKey: "score",
  sortDir: "desc",
}

export const useVaultStore = create<VaultState>()(
  persist(
    (set, get) => ({
      tracks: SEED_TRACKS,
      queue: [],
      nowPlayingId: null,
      selectedId: SEED_TRACKS[0]?.id ?? null,
      filters: defaultFilters,
      darkMode: true,
      showAddForm: false,
      similarToId: null,

      addTrack: (input) => {
        const track: Track = {
          id: uid(),
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
      },

      removeTrack: (id) => {
        set((s) => ({
          tracks: s.tracks.filter((t) => t.id !== id),
          queue: s.queue.filter((q) => q !== id),
          nowPlayingId: s.nowPlayingId === id ? null : s.nowPlayingId,
          selectedId: s.selectedId === id ? null : s.selectedId,
          similarToId: s.similarToId === id ? null : s.similarToId,
        }))
      },

      vote: (id, delta) => {
        set((s) => ({
          tracks: s.tracks.map((t) =>
            t.id === id ? { ...t, score: t.score + delta } : t,
          ),
        }))
      },

      updateNotes: (id, notes) => {
        set((s) => ({
          tracks: s.tracks.map((t) => (t.id === id ? { ...t, notes } : t)),
        }))
      },

      resetToSeed: () => {
        set({
          tracks: SEED_TRACKS,
          queue: [],
          nowPlayingId: null,
          selectedId: SEED_TRACKS[0]?.id ?? null,
          filters: defaultFilters,
        })
      },

      importTracks: (tracks, mode) => {
        if (mode === "replace") {
          set({
            tracks,
            queue: [],
            nowPlayingId: null,
            selectedId: tracks[0]?.id ?? null,
          })
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

      play: (id) => set({ nowPlayingId: id, selectedId: id }),
      stop: () => set({ nowPlayingId: null }),

      enqueue: (id) => {
        set((s) => (s.queue.includes(id) ? s : { queue: [...s.queue, id] }))
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
        set({ nowPlayingId: first, selectedId: first, queue: rest })
      },

      playNext: () => {
        const { queue, nowPlayingId, tracks } = get()
        if (queue.length > 0) {
          const [next, ...rest] = queue
          set({ nowPlayingId: next, selectedId: next, queue: rest })
          return
        }
        // fall back: next track in score order among all tracks
        const sorted = [...tracks].sort((a, b) => b.score - a.score)
        if (!nowPlayingId) {
          if (sorted[0]) set({ nowPlayingId: sorted[0].id, selectedId: sorted[0].id })
          return
        }
        const idx = sorted.findIndex((t) => t.id === nowPlayingId)
        const next = sorted[idx + 1] ?? sorted[0]
        if (next) set({ nowPlayingId: next.id, selectedId: next.id })
      },

      playPrev: () => {
        const { nowPlayingId, tracks } = get()
        const sorted = [...tracks].sort((a, b) => b.score - a.score)
        if (!nowPlayingId) {
          if (sorted[0]) set({ nowPlayingId: sorted[0].id, selectedId: sorted[0].id })
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
      // Persist library + current track (and related UI prefs) to localStorage.
      // Transient UI (showAddForm) and selection focus are intentionally omitted.
      partialize: (s) => ({
        tracks: s.tracks,
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

        return {
          ...current,
          ...p,
          tracks,
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
