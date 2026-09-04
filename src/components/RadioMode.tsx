import { useEffect, useMemo, useRef, useState } from "react"
import {
  selectPlaybackTracks,
  useVaultStore,
} from "../store/useVaultStore"
import { findSimilarTracks } from "../lib/similarTracks"
import {
  fetchSimilarVideos,
  guessTitleArtist,
} from "../lib/youtubeDiscover"
import { useToastStore } from "../store/useToastStore"
import type { Track } from "../types"

/** Keep at least this many tracks lined up ahead of now-playing. */
const QUEUE_FLOOR = 3
/** Don't pile on more than this in one fill pass. */
const FILL_BATCH = 5

/**
 * Radio Mode - Endless discovery playback.
 * Starts the seed track immediately, then keeps the queue filled with
 * similar vault tracks and (when available) YouTube discoveries.
 */
export function RadioMode() {
  const tracks = useVaultStore((s) => s.tracks)
  const guestTracks = useVaultStore((s) => s.guestTracks)
  const previewTrack = useVaultStore((s) => s.previewTrack)
  const nowPlayingId = useVaultStore((s) => s.nowPlayingId)
  const selectedId = useVaultStore((s) => s.selectedId)
  const queue = useVaultStore((s) => s.queue)
  const play = useVaultStore((s) => s.play)
  const enqueueMany = useVaultStore((s) => s.enqueueMany)
  const ingestDiscoveredTracks = useVaultStore((s) => s.ingestDiscoveredTracks)
  const showToast = useToastStore((s) => s.show)

  const playbackTracks = useMemo(
    () => selectPlaybackTracks({ tracks, guestTracks, previewTrack }),
    [tracks, guestTracks, previewTrack],
  )

  const seed = useMemo(() => {
    if (nowPlayingId) {
      const current = playbackTracks.find((t) => t.id === nowPlayingId)
      if (current) return current
    }
    if (selectedId) {
      const selected = playbackTracks.find((t) => t.id === selectedId)
      if (selected) return selected
    }
    return (
      [...playbackTracks].sort((a, b) => b.score - a.score)[0] ?? null
    )
  }, [nowPlayingId, selectedId, playbackTracks])

  const [radioActive, setRadioActive] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [discoveredCount, setDiscoveredCount] = useState(0)

  const radioActiveRef = useRef(false)
  const playedRef = useRef<Set<string>>(new Set())
  const fetchedForRef = useRef<string | null>(null)
  const reshuffledForRef = useRef<string | null>(null)

  radioActiveRef.current = radioActive

  function markPlayed(ids: string[]) {
    for (const id of ids) playedRef.current.add(id)
    setDiscoveredCount(playedRef.current.size)
  }

  function queueVaultSimilar(from: Track): number {
    const state = useVaultStore.getState()
    const library = selectPlaybackTracks(state)
    const similar = findSimilarTracks(from, library, 20)
      .map((m) => m.track)
      .filter(
        (t) =>
          t.id !== from.id &&
          t.id !== state.nowPlayingId &&
          !playedRef.current.has(t.id) &&
          !state.queue.includes(t.id),
      )
      .slice(0, FILL_BATCH)
    if (similar.length === 0) return 0
    const ids = similar.map((t) => t.id)
    markPlayed(ids)
    enqueueMany(ids)
    return ids.length
  }

  async function queueYoutubeSimilar(
    from: Track,
    signal: AbortSignal,
  ): Promise<number> {
    setDiscovering(true)
    try {
      const library = selectPlaybackTracks(useVaultStore.getState())
      const { items } = await fetchSimilarVideos(from, library, signal)
      if (signal.aborted || !radioActiveRef.current) return 0

      const room = Math.max(
        0,
        FILL_BATCH - useVaultStore.getState().queue.length,
      )
      if (room === 0) return 0

      const inputs = items.slice(0, room + 3).map((v) => {
        const { title, artist } = guessTitleArtist(v.title, v.channelTitle)
        return {
          youtubeId: v.youtubeId,
          title,
          artist,
          genre: from.genre,
          era: from.era,
          year: from.year,
          notes: `Radio · similar to ${from.artist} — ${from.title}`,
        }
      })
      const ids = ingestDiscoveredTracks(inputs).filter((id) => {
        const state = useVaultStore.getState()
        return (
          id !== from.id &&
          id !== state.nowPlayingId &&
          !playedRef.current.has(id) &&
          !state.queue.includes(id)
        )
      })
      if (ids.length === 0) return 0
      const next = ids.slice(0, room)
      markPlayed(next)
      enqueueMany(next)
      return next.length
    } catch {
      return 0
    } finally {
      if (!signal.aborted) setDiscovering(false)
    }
  }

  // Keep the queue filled while radio is on. Refs hold played/fetched
  // identity so this cannot loop on a new Set() each render.
  useEffect(() => {
    if (!radioActive || !nowPlayingId) return

    const current = useVaultStore.getState().resolveTrack(nowPlayingId)
    if (!current) return

    playedRef.current.add(nowPlayingId)

    if (queue.length >= QUEUE_FLOOR) return

    queueVaultSimilar(current)

    if (useVaultStore.getState().queue.length >= QUEUE_FLOOR) return

    if (fetchedForRef.current === nowPlayingId) {
      // Already tried YouTube for this seed. Reshuffle vault once so
      // radio never sits on an empty queue.
      if (
        useVaultStore.getState().queue.length === 0 &&
        reshuffledForRef.current !== nowPlayingId
      ) {
        reshuffledForRef.current = nowPlayingId
        playedRef.current = new Set([nowPlayingId])
        queueVaultSimilar(current)
      }
      return
    }

    fetchedForRef.current = nowPlayingId
    const ac = new AbortController()
    void queueYoutubeSimilar(current, ac.signal)
    return () => {
      ac.abort()
      setDiscovering(false)
    }
  }, [radioActive, nowPlayingId, queue.length])

  function startRadio() {
    if (!seed) {
      showToast("Add a track first to start radio", "info")
      return
    }

    playedRef.current = new Set([seed.id])
    fetchedForRef.current = null
    reshuffledForRef.current = null
    setDiscoveredCount(1)
    setRadioActive(true)
    radioActiveRef.current = true

    // User gesture: start or resume the seed so something actually plays.
    play(seed.id)
    queueVaultSimilar(seed)

    showToast(`Radio started — music like ${seed.artist}`, "success")
    queueMicrotask(() => {
      document
        .querySelector('[aria-label="Player and queue"]')
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    })
  }

  function stopRadio() {
    setRadioActive(false)
    radioActiveRef.current = false
    setDiscovering(false)
    playedRef.current = new Set()
    fetchedForRef.current = null
    reshuffledForRef.current = null
    setDiscoveredCount(0)
    showToast("Radio mode stopped", "info")
  }

  const seedLabel = seed ? `${seed.artist} — ${seed.title}` : null

  return (
    <div className="overflow-hidden rounded-xl border border-vault-border bg-vault-surface shadow-lg">
      <div className="flex items-center justify-between border-b border-vault-border px-4 py-2.5">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-vault-muted">
            Radio Mode
          </h2>
          <p className="mt-0.5 text-[10px] text-vault-muted/70">
            {radioActive
              ? "Endless discovery playback"
              : seedLabel
                ? `Starts from ${seedLabel}`
                : "Endless discovery playback"}
          </p>
        </div>
        {radioActive ? (
          <button
            type="button"
            onClick={stopRadio}
            className="flex items-center gap-1.5 rounded-lg bg-vault-red/20 px-3 py-1.5 text-xs font-medium text-vault-red hover:bg-vault-red/30"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-vault-red opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-vault-red"></span>
            </span>
            Stop Radio
          </button>
        ) : (
          <button
            type="button"
            onClick={startRadio}
            disabled={!seed}
            className="rounded-lg bg-vault-amber px-3 py-1.5 text-xs font-medium text-stone-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Start Radio
          </button>
        )}
      </div>

      {radioActive && seed && (
        <div className="space-y-2 p-3">
          <div className="rounded-lg border border-vault-amber/30 bg-vault-amber/5 p-3">
            <div className="flex items-start gap-2">
              <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-vault-amber opacity-75"></span>
                <span className="relative flex h-3 w-3 rounded-full bg-vault-amber"></span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-vault-amber">
                  Radio Active
                </p>
                <p className="mt-1 text-[11px] text-vault-muted">
                  Playing music similar to{" "}
                  <span className="font-medium text-vault-text">
                    {seed.artist}
                  </span>
                </p>
                <p className="mt-1 text-[10px] text-vault-muted/70">
                  {discoveredCount} tracks discovered · {queue.length} queued
                  {discovering ? " · finding more…" : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-vault-elevated/50 p-2.5 text-[11px] text-vault-muted">
            <p>
              <span className="font-semibold text-vault-text">How it works:</span>{" "}
              Radio starts the seed track, then automatically finds and queues
              similar songs as you listen.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
