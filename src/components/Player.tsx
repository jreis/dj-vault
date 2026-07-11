import { useEffect, useMemo, useRef, useState } from "react"
import { useVaultStore } from "../store/useVaultStore"
import { youtubeWatchUrl } from "../lib/youtube"
import {
  createYouTubePlayer,
  youtubeErrorMessage,
  type YtPlayer,
} from "../lib/youtubeApi"

/** Auto-skip delay after an unavailable embed so the user can read the message. */
const UNAVAILABLE_SKIP_MS = 2500

export function Player() {
  const tracks = useVaultStore((s) => s.tracks)
  const nowPlayingId = useVaultStore((s) => s.nowPlayingId)
  const queue = useVaultStore((s) => s.queue)
  const playNext = useVaultStore((s) => s.playNext)
  const playPrev = useVaultStore((s) => s.playPrev)
  const stop = useVaultStore((s) => s.stop)
  const dequeue = useVaultStore((s) => s.dequeue)
  const clearQueue = useVaultStore((s) => s.clearQueue)
  const play = useVaultStore((s) => s.play)
  const moveQueue = useVaultStore((s) => s.moveQueue)
  const playSet = useVaultStore((s) => s.playSet)
  const setSimilarTo = useVaultStore((s) => s.setSimilarTo)
  const similarToId = useVaultStore((s) => s.similarToId)

  const current = tracks.find((t) => t.id === nowPlayingId)
  const queueTracks = queue
    .map((id) => tracks.find((t) => t.id === id))
    .filter(Boolean)

  const setSize = (current ? 1 : 0) + queueTracks.length

  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YtPlayer | null>(null)
  /** Track id the player was last wired for — guards stale async callbacks. */
  const wiredTrackIdRef = useRef<string | null>(null)
  const playNextRef = useRef(playNext)
  playNextRef.current = playNext

  const [unavailable, setUnavailable] = useState<string | null>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const trackId = current?.id ?? null
  const videoId = current?.youtubeId ?? null

  // Mount / remount YouTube player when the vault track changes.
  useEffect(() => {
    if (!trackId || !videoId) {
      playerRef.current?.destroy()
      playerRef.current = null
      wiredTrackIdRef.current = null
      setUnavailable(null)
      setPlayerReady(false)
      setApiError(null)
      return
    }

    wiredTrackIdRef.current = trackId
    setUnavailable(null)
    setPlayerReady(false)
    setApiError(null)

    let cancelled = false
    let skipTimer: ReturnType<typeof setTimeout> | null = null
    const host = hostRef.current
    if (!host) return

    // YT.Player replaces the host node; keep a stable mount point via a child.
    host.replaceChildren()
    const mount = document.createElement("div")
    mount.className = "h-full w-full"
    host.appendChild(mount)

    playerRef.current?.destroy()
    playerRef.current = null

    const scheduleSkip = () => {
      if (skipTimer) clearTimeout(skipTimer)
      skipTimer = setTimeout(() => {
        if (cancelled || wiredTrackIdRef.current !== trackId) return
        playNextRef.current()
      }, UNAVAILABLE_SKIP_MS)
    }

    createYouTubePlayer({
      element: mount,
      videoId,
      autoplay: true,
      onReady: () => {
        if (cancelled || wiredTrackIdRef.current !== trackId) return
        setPlayerReady(true)
      },
      onEnded: () => {
        if (cancelled || wiredTrackIdRef.current !== trackId) return
        playNextRef.current()
      },
      onError: (code) => {
        if (cancelled || wiredTrackIdRef.current !== trackId) return
        setUnavailable(youtubeErrorMessage(code))
        scheduleSkip()
      },
    })
      .then((player) => {
        if (cancelled || wiredTrackIdRef.current !== trackId) {
          player.destroy()
          return
        }
        playerRef.current = player
      })
      .catch((err: unknown) => {
        if (cancelled || wiredTrackIdRef.current !== trackId) return
        const msg =
          err instanceof Error ? err.message : "Could not load YouTube player"
        setApiError(msg)
        setUnavailable("Player failed to load")
        scheduleSkip()
      })

    return () => {
      cancelled = true
      if (skipTimer) clearTimeout(skipTimer)
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [trackId, videoId])

  const skipLabel = useMemo(() => {
    if (!unavailable) return null
    const hasQueue = queue.length > 0
    return hasQueue ? "Skipping to next in queue…" : "Skipping to next track…"
  }, [unavailable, queue.length])

  return (
    <aside className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-vault-border bg-vault-surface shadow-lg">
        <div className="flex items-center justify-between border-b border-vault-border px-4 py-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-vault-muted">
            Now playing
          </h2>
          {setSize > 1 && (
            <span className="text-[10px] font-medium uppercase tracking-wide text-vault-amber">
              Multi-track · {setSize}
            </span>
          )}
        </div>

        {current ? (
          <>
            <div className="relative aspect-video w-full bg-black">
              <div ref={hostRef} className="h-full w-full" />
              {unavailable && (
                <div
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-stone-950/92 p-6 text-center backdrop-blur-sm"
                  role="alert"
                >
                  <p className="text-sm font-semibold text-vault-red">
                    Video unavailable
                  </p>
                  <p className="max-w-xs text-xs text-vault-muted">
                    {unavailable}
                    {apiError ? ` · ${apiError}` : ""}
                  </p>
                  {skipLabel && (
                    <p className="text-[11px] text-vault-amber/90">{skipLabel}</p>
                  )}
                  <div className="mt-1 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => playNext()}
                      className="min-h-9 rounded-lg border border-vault-amber bg-vault-amber/15 px-3 py-1.5 text-xs font-medium text-vault-amber hover:bg-vault-amber/25"
                    >
                      Skip now
                    </button>
                    <a
                      href={youtubeWatchUrl(current.youtubeId)}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-9 rounded-lg border border-vault-border px-3 py-1.5 text-xs text-vault-muted hover:text-vault-blue"
                    >
                      Open on YouTube ↗
                    </a>
                    <button
                      type="button"
                      onClick={() => stop()}
                      className="min-h-9 rounded-lg border border-vault-border px-3 py-1.5 text-xs text-vault-muted hover:text-vault-red"
                    >
                      Stop
                    </button>
                  </div>
                </div>
              )}
              {!playerReady && !unavailable && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
                  <span className="text-xs text-vault-muted">Loading…</span>
                </div>
              )}
            </div>
            <div className="space-y-3 p-4">
              <div>
                <p className="font-semibold text-vault-text">{current.title}</p>
                <p className="text-sm text-vault-muted">
                  {current.artist} · {current.year} · {current.genre}
                </p>
                {current.notes && (
                  <p className="mt-1 text-xs italic text-vault-muted/80">
                    {current.notes}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={playPrev}
                  className="min-h-9 rounded-lg border border-vault-border px-3 py-1.5 text-xs text-vault-muted hover:text-vault-text"
                >
                  ‹ Prev
                </button>
                <button
                  type="button"
                  onClick={playNext}
                  className="min-h-9 rounded-lg border border-vault-border bg-vault-elevated px-3 py-1.5 text-xs font-medium text-vault-amber hover:border-vault-amber"
                >
                  Next ›
                </button>
                <button
                  type="button"
                  onClick={stop}
                  className="min-h-9 rounded-lg border border-vault-border px-3 py-1.5 text-xs text-vault-muted hover:text-vault-red"
                >
                  Stop
                </button>
                <a
                  href={youtubeWatchUrl(current.youtubeId)}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-9 rounded-lg border border-vault-border px-3 py-1.5 text-xs text-vault-muted hover:text-vault-blue"
                >
                  YouTube ↗
                </a>
                <button
                  type="button"
                  onClick={() =>
                    setSimilarTo(
                      similarToId === current.id ? null : current.id,
                    )
                  }
                  className={`min-h-9 rounded-lg border px-3 py-1.5 text-xs ${
                    similarToId === current.id
                      ? "border-vault-blue bg-vault-blue/15 text-vault-blue"
                      : "border-vault-border text-vault-muted hover:border-vault-blue hover:text-vault-blue"
                  }`}
                  title="Find similar tracks in vault (s)"
                >
                  Similar
                </button>
              </div>
              {queueTracks.length > 0 && !unavailable && (
                <p className="text-[11px] text-vault-muted/80">
                  Auto-advances through the queue when a track ends (or is
                  unavailable).
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-vault-elevated/50 p-6 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full border border-vault-amber/30 text-2xl text-vault-amber/50"
              aria-hidden
            >
              ◎
            </div>
            <p className="text-sm font-medium text-vault-text">Nothing playing</p>
            <p className="max-w-[16rem] text-xs leading-relaxed text-vault-muted/80">
              Select a track and press{" "}
              <kbd className="rounded border border-vault-border px-1 font-mono">
                Enter
              </kbd>
              , double-click a row, or start a set below.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {queueTracks.length > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    playSet(
                      queueTracks
                        .map((t) => t?.id)
                        .filter((id): id is string => Boolean(id)),
                    )
                  }
                  className="rounded-lg bg-vault-amber px-3 py-1.5 text-xs font-medium text-stone-950 hover:bg-amber-400"
                >
                  Play queue ({queueTracks.length})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const top = [...tracks]
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 5)
                      .map((t) => t.id)
                    if (top.length) playSet(top)
                  }}
                  className="rounded-lg bg-vault-amber px-3 py-1.5 text-xs font-medium text-stone-950 hover:bg-amber-400"
                >
                  Play top 5 by score
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-vault-border bg-vault-surface shadow-lg">
        <div className="flex items-center justify-between border-b border-vault-border px-4 py-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-vault-muted">
            Queue{" "}
            <span className="font-mono text-vault-amber">
              {queueTracks.length}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            {queueTracks.length > 0 && !current && (
              <button
                type="button"
                onClick={() =>
                  playSet(
                    queueTracks
                      .map((t) => t?.id)
                      .filter((id): id is string => Boolean(id)),
                  )
                }
                className="text-xs text-vault-amber hover:underline"
              >
                Play all
              </button>
            )}
            {queueTracks.length > 0 && (
              <button
                type="button"
                onClick={clearQueue}
                className="text-xs text-vault-muted hover:text-vault-red"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        {queueTracks.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-vault-muted">
            Queue is empty. Hit{" "}
            <kbd className="rounded border border-vault-border px-1 font-mono">
              q
            </kbd>{" "}
            on a selected track, or use{" "}
            <span className="text-vault-text">Queue all matching</span>.
          </p>
        ) : (
          <ol className="max-h-64 divide-y divide-vault-border/60 overflow-y-auto sm:max-h-72">
            {queueTracks.map((t, i) =>
              t ? (
                <li
                  key={t.id}
                  className="flex items-center gap-1.5 px-2 py-2 text-sm sm:gap-2 sm:px-3"
                >
                  <span className="w-5 shrink-0 font-mono text-xs text-vault-muted">
                    {i + 1}
                  </span>
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveQueue(t.id, -1)}
                      disabled={i === 0}
                      className="rounded px-1 text-[10px] text-vault-muted hover:text-vault-text disabled:opacity-25"
                      aria-label="Move up in queue"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQueue(t.id, 1)}
                      disabled={i === queueTracks.length - 1}
                      className="rounded px-1 text-[10px] text-vault-muted hover:text-vault-text disabled:opacity-25"
                      aria-label="Move down in queue"
                    >
                      ▼
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => play(t.id)}
                    className="min-w-0 flex-1 truncate text-left hover:text-vault-amber"
                  >
                    <span className="text-vault-text">{t.title}</span>
                    <span className="text-vault-muted"> — {t.artist}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => dequeue(t.id)}
                    className="min-h-8 min-w-8 shrink-0 text-vault-muted hover:text-vault-red"
                    aria-label={`Remove ${t.title} from queue`}
                  >
                    ✕
                  </button>
                </li>
              ) : null,
            )}
          </ol>
        )}
      </div>
    </aside>
  )
}
