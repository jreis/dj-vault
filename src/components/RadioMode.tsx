import { useState, useEffect } from "react"
import { useVaultStore } from "../store/useVaultStore"
import { findSimilarTracks } from "../lib/similarTracks"
import { useToastStore } from "../store/useToastStore"

/**
 * Radio Mode - Endless discovery playback
 * Automatically queues similar tracks when queue is low
 */
export function RadioMode() {
  const tracks = useVaultStore((s) => s.tracks)
  const nowPlayingId = useVaultStore((s) => s.nowPlayingId)
  const queue = useVaultStore((s) => s.queue)
  const enqueueMany = useVaultStore((s) => s.enqueueMany)
  const showToast = useToastStore((s) => s.show)

  const [radioActive, setRadioActive] = useState(false)
  const [playedIds, setPlayedIds] = useState<Set<string>>(new Set())

  // Auto-queue similar tracks when queue gets low
  useEffect(() => {
    if (!radioActive || !nowPlayingId) return

    // Keep queue filled with 3-5 tracks
    if (queue.length >= 3) return

    const currentTrack = tracks.find((t) => t.id === nowPlayingId)
    if (!currentTrack) return

    // Find similar tracks we haven't played yet
    const similar = findSimilarTracks(currentTrack, tracks, 20)
      .filter((m) => !playedIds.has(m.track.id))
      .filter((m) => m.track.id !== nowPlayingId)
      .filter((m) => !queue.includes(m.track.id))
      .slice(0, 5)

    if (similar.length === 0) {
      // Ran out of similar tracks, start over
      setPlayedIds(new Set([nowPlayingId]))
      return
    }

    const idsToQueue = similar.map((m) => m.track.id)
    enqueueMany(idsToQueue)

    // Mark as played
    setPlayedIds((prev) => {
      const next = new Set(prev)
      idsToQueue.forEach((id) => next.add(id))
      return next
    })
  }, [radioActive, nowPlayingId, queue.length, tracks, enqueueMany, playedIds])

  // Track what's been played
  useEffect(() => {
    if (!radioActive || !nowPlayingId) return
    setPlayedIds((prev) => new Set(prev).add(nowPlayingId))
  }, [radioActive, nowPlayingId])

  function startRadio() {
    if (!nowPlayingId) {
      showToast("Play a track first to start radio mode", "info")
      return
    }

    const currentTrack = tracks.find((t) => t.id === nowPlayingId)
    if (!currentTrack) return

    setRadioActive(true)
    setPlayedIds(new Set([nowPlayingId]))
    showToast(
      `Radio mode started - discovering music like ${currentTrack.artist}`,
      "success"
    )
  }

  function stopRadio() {
    setRadioActive(false)
    setPlayedIds(new Set())
    showToast("Radio mode stopped", "info")
  }

  const currentTrack = nowPlayingId
    ? tracks.find((t) => t.id === nowPlayingId)
    : null

  if (!currentTrack) return null

  return (
    <div className="overflow-hidden rounded-xl border border-vault-border bg-vault-surface shadow-lg">
      <div className="flex items-center justify-between border-b border-vault-border px-4 py-2.5">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-vault-muted">
            Radio Mode
          </h2>
          <p className="mt-0.5 text-[10px] text-vault-muted/70">
            Endless discovery playback
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
            className="rounded-lg bg-vault-amber px-3 py-1.5 text-xs font-medium text-stone-950 hover:bg-amber-400"
          >
            Start Radio
          </button>
        )}
      </div>

      {radioActive && (
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
                    {currentTrack.artist}
                  </span>
                </p>
                <p className="mt-1 text-[10px] text-vault-muted/70">
                  {playedIds.size} tracks discovered • {queue.length} queued
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-vault-elevated/50 p-2.5 text-[11px] text-vault-muted">
            <p>
              <span className="font-semibold text-vault-text">How it works:</span>{" "}
              Radio mode automatically finds and queues similar tracks as you
              listen, creating an endless discovery experience.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
