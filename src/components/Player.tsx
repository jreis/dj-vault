import { useEffect, useMemo, useRef, useState } from "react"
import { useVaultStore } from "../store/useVaultStore"
import { youtubeThumbUrl, youtubeWatchUrl } from "../lib/youtube"
import {
  createYouTubePlayer,
  youtubeErrorMessage,
  type YtPlayer,
} from "../lib/youtubeApi"
import type { Track } from "../types"

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
  const setMode = useVaultStore((s) => s.setMode)
  const setSetMode = useVaultStore((s) => s.setSetMode)
  const toggleSetMode = useVaultStore((s) => s.toggleSetMode)

  const current = tracks.find((t) => t.id === nowPlayingId)
  const queueTracks = queue
    .map((id) => tracks.find((t) => t.id === id))
    .filter((t): t is Track => Boolean(t))

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

  // Lock page scroll while Set Mode is open.
  useEffect(() => {
    if (!setMode) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [setMode])

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

  function startTopSet() {
    const top = [...tracks]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((t) => t.id)
    if (top.length) playSet(top)
  }

  // Single tree: set mode is CSS/layout only so the YT host never unmounts mid-track.
  return (
    <div
      className={
        setMode
          ? "set-mode-shell fixed inset-0 z-[100] flex flex-col overflow-hidden bg-stone-950 text-stone-50"
          : "flex flex-col gap-4"
      }
      role={setMode ? "dialog" : undefined}
      aria-modal={setMode ? true : undefined}
      aria-label={setMode ? "Set mode" : undefined}
    >
      {setMode && current && (
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          aria-hidden
        >
          <img
            src={youtubeThumbUrl(current.youtubeId)}
            alt=""
            className="h-full w-full scale-110 object-cover blur-3xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/40 via-stone-950/85 to-stone-950" />
        </div>
      )}

      {setMode && (
        <header className="relative z-10 flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="set-mode-live inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
              <span className="set-mode-live-dot h-1.5 w-1.5 rounded-full bg-amber-400" />
              Live set
            </span>
            <p className="truncate text-xs text-stone-400 sm:text-sm">
              {setSize > 0 ? (
                <>
                  <span className="font-mono text-amber-400">{setSize}</span> in
                  set
                  {queueTracks.length > 0 && (
                    <span className="text-stone-500">
                      {" "}
                      · {queueTracks.length} up next
                    </span>
                  )}
                </>
              ) : (
                "Nothing in the set yet"
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-[11px] text-stone-500 sm:inline">
              <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-stone-300">
                f
              </kbd>{" "}
              or{" "}
              <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-stone-300">
                Esc
              </kbd>{" "}
              exit
            </span>
            <button
              type="button"
              onClick={() => setSetMode(false)}
              className="min-h-9 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-stone-200 hover:border-amber-500/50 hover:text-amber-400"
            >
              Exit
            </button>
          </div>
        </header>
      )}

      <div
        className={
          setMode
            ? "relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-6 lg:flex-row lg:items-start lg:overflow-hidden"
            : "contents"
        }
      >
        {/* Main player column */}
        <div
          className={
            setMode
              ? "flex min-w-0 flex-1 flex-col gap-4"
              : "overflow-hidden rounded-xl border border-vault-border bg-vault-surface shadow-lg"
          }
        >
          {!setMode && (
            <div className="flex items-center justify-between border-b border-vault-border px-4 py-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-vault-muted">
                Now playing
              </h2>
              <div className="flex items-center gap-2">
                {setSize > 1 && (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-vault-amber">
                    Multi-track · {setSize}
                  </span>
                )}
                {current && (
                  <button
                    type="button"
                    onClick={() => setSetMode(true)}
                    className="rounded-md border border-vault-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-vault-muted transition hover:border-vault-amber hover:text-vault-amber"
                    title="Open set mode (f)"
                  >
                    Set mode
                  </button>
                )}
              </div>
            </div>
          )}

          {current ? (
            <>
              {/* Stable video host — never conditionally unmounted */}
              <div
                className={
                  setMode
                    ? "relative aspect-video w-full max-h-[min(56vh,720px)] overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/10"
                    : "relative aspect-video w-full bg-black"
                }
              >
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
                      <p className="text-[11px] text-vault-amber/90">
                        {skipLabel}
                      </p>
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

              <div className={setMode ? "space-y-3" : "space-y-3 p-4"}>
                <div>
                  <p
                    className={
                      setMode
                        ? "text-2xl font-semibold tracking-tight text-white sm:text-3xl"
                        : "font-semibold text-vault-text"
                    }
                  >
                    {current.title}
                  </p>
                  <p
                    className={
                      setMode
                        ? "mt-1 text-base text-stone-400 sm:text-lg"
                        : "text-sm text-vault-muted"
                    }
                  >
                    {current.artist}
                    {setMode ? (
                      <>
                        <span className="text-stone-600"> · </span>
                        {current.year}
                        <span className="text-stone-600"> · </span>
                        <span className="text-amber-400/90">{current.genre}</span>
                        <span className="text-stone-600"> · </span>
                        {current.era}
                      </>
                    ) : (
                      <>
                        {" "}
                        · {current.year} · {current.genre}
                      </>
                    )}
                  </p>
                  {current.notes && (
                    <p
                      className={
                        setMode
                          ? "mt-2 max-w-2xl text-sm italic text-stone-500"
                          : "mt-1 text-xs italic text-vault-muted/80"
                      }
                    >
                      {current.notes}
                    </p>
                  )}
                  {setMode && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs ${
                          current.score > 0
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : current.score < 0
                              ? "border-red-500/30 bg-red-500/10 text-red-400"
                              : "border-white/10 bg-white/5 text-stone-400"
                        }`}
                        title="Vote score"
                      >
                        {current.score > 0 ? `+${current.score}` : current.score}{" "}
                        score
                      </span>
                      <div className="now-playing-eq" aria-hidden>
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={playPrev}
                    className={
                      setMode
                        ? "min-h-9 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-stone-300 hover:text-white"
                        : "min-h-9 rounded-lg border border-vault-border px-3 py-1.5 text-xs text-vault-muted hover:text-vault-text"
                    }
                  >
                    ‹ Prev
                  </button>
                  <button
                    type="button"
                    onClick={playNext}
                    className={
                      setMode
                        ? "min-h-9 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/25"
                        : "min-h-9 rounded-lg border border-vault-border bg-vault-elevated px-3 py-1.5 text-xs font-medium text-vault-amber hover:border-vault-amber"
                    }
                  >
                    Next ›
                  </button>
                  <button
                    type="button"
                    onClick={stop}
                    className={
                      setMode
                        ? "min-h-9 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-stone-400 hover:text-red-400"
                        : "min-h-9 rounded-lg border border-vault-border px-3 py-1.5 text-xs text-vault-muted hover:text-vault-red"
                    }
                  >
                    Stop
                  </button>
                  <a
                    href={youtubeWatchUrl(current.youtubeId)}
                    target="_blank"
                    rel="noreferrer"
                    className={
                      setMode
                        ? "min-h-9 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-stone-400 hover:text-sky-400"
                        : "min-h-9 rounded-lg border border-vault-border px-3 py-1.5 text-xs text-vault-muted hover:text-vault-blue"
                    }
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
                    className={
                      similarToId === current.id
                        ? setMode
                          ? "min-h-9 rounded-lg border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-xs text-sky-400"
                          : "min-h-9 rounded-lg border border-vault-blue bg-vault-blue/15 px-3 py-1.5 text-xs text-vault-blue"
                        : setMode
                          ? "min-h-9 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-stone-400 hover:border-sky-500/40 hover:text-sky-400"
                          : "min-h-9 rounded-lg border border-vault-border px-3 py-1.5 text-xs text-vault-muted hover:border-vault-blue hover:text-vault-blue"
                    }
                    title="Find similar tracks in vault (s)"
                  >
                    Similar
                  </button>
                  <button
                    type="button"
                    onClick={toggleSetMode}
                    className={
                      setMode
                        ? "min-h-9 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-400"
                        : "min-h-9 rounded-lg border border-vault-border px-3 py-1.5 text-xs font-medium text-vault-muted hover:border-vault-amber hover:text-vault-amber"
                    }
                    title="Set mode (f)"
                  >
                    {setMode ? "Exit set mode" : "Set mode"}
                  </button>
                </div>

                {queueTracks.length > 0 && !unavailable && (
                  <p
                    className={
                      setMode
                        ? "text-[11px] text-stone-500"
                        : "text-[11px] text-vault-muted/80"
                    }
                  >
                    {setMode ? (
                      <>
                        Auto-advances through the queue ·{" "}
                        <kbd className="rounded border border-white/10 px-1 font-mono text-stone-400">
                          n
                        </kbd>
                        /
                        <kbd className="rounded border border-white/10 px-1 font-mono text-stone-400">
                          p
                        </kbd>{" "}
                        next/prev
                      </>
                    ) : (
                      "Auto-advances through the queue when a track ends (or is unavailable)."
                    )}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div
              className={
                setMode
                  ? "flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-white/10 bg-white/5 p-10 text-center"
                  : "flex aspect-video flex-col items-center justify-center gap-2 bg-vault-elevated/50 p-6 text-center"
              }
            >
              {/* Keep host mounted even when idle so set-mode toggles never drop the ref */}
              <div ref={hostRef} className="hidden" aria-hidden />
              <div
                className={
                  setMode
                    ? "flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/30 text-3xl text-amber-500/50"
                    : "flex h-12 w-12 items-center justify-center rounded-full border border-vault-amber/30 text-2xl text-vault-amber/50"
                }
                aria-hidden
              >
                ◎
              </div>
              <div>
                <p
                  className={
                    setMode
                      ? "text-lg font-medium text-white"
                      : "text-sm font-medium text-vault-text"
                  }
                >
                  Nothing playing
                </p>
                <p
                  className={
                    setMode
                      ? "mt-1 max-w-sm text-sm text-stone-400"
                      : "max-w-[16rem] text-xs leading-relaxed text-vault-muted/80"
                  }
                >
                  {setMode
                    ? "Start a multi-track set from the vault, or queue tracks and hit play."
                    : (
                      <>
                        Select a track and press{" "}
                        <kbd className="rounded border border-vault-border px-1 font-mono">
                          Enter
                        </kbd>
                        , double-click a row, or start a set below.
                      </>
                    )}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {queueTracks.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => playSet(queueTracks.map((t) => t.id))}
                    className={
                      setMode
                        ? "rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-stone-950 hover:bg-amber-400"
                        : "rounded-lg bg-vault-amber px-3 py-1.5 text-xs font-medium text-stone-950 hover:bg-amber-400"
                    }
                  >
                    Play queue ({queueTracks.length})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startTopSet}
                    className={
                      setMode
                        ? "rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-stone-950 hover:bg-amber-400"
                        : "rounded-lg bg-vault-amber px-3 py-1.5 text-xs font-medium text-stone-950 hover:bg-amber-400"
                    }
                  >
                    Play top 5 by score
                  </button>
                )}
                {setMode ? (
                  <button
                    type="button"
                    onClick={() => setSetMode(false)}
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm text-stone-300 hover:border-amber-500/50 hover:text-amber-400"
                  >
                    Back to vault
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSetMode(true)}
                    className="rounded-lg border border-vault-border px-3 py-1.5 text-xs text-vault-muted hover:border-vault-amber hover:text-vault-amber"
                  >
                    Set mode
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Queue / Up next — always in tree; hostRef is only in the player column */}
        <div
          className={
            setMode
              ? "w-full shrink-0 lg:w-80 xl:w-96"
              : "overflow-hidden rounded-xl border border-vault-border bg-vault-surface shadow-lg"
          }
        >
          <div
            className={
              setMode
                ? "overflow-hidden rounded-xl border border-white/10 bg-stone-900/80 shadow-xl backdrop-blur-md"
                : "contents"
            }
          >
            <div
              className={
                setMode
                  ? "flex items-center justify-between border-b border-white/10 px-4 py-2.5"
                  : "flex items-center justify-between border-b border-vault-border px-4 py-2.5"
              }
            >
              <h2
                className={
                  setMode
                    ? "text-xs font-semibold uppercase tracking-wide text-stone-400"
                    : "text-xs font-semibold uppercase tracking-wide text-vault-muted"
                }
              >
                {setMode ? "Up next" : "Queue"}{" "}
                <span
                  className={
                    setMode
                      ? "font-mono text-amber-400"
                      : "font-mono text-vault-amber"
                  }
                >
                  {queueTracks.length}
                </span>
              </h2>
              <div className="flex items-center gap-2">
                {!setMode && queueTracks.length > 0 && !current && (
                  <button
                    type="button"
                    onClick={() => playSet(queueTracks.map((t) => t.id))}
                    className="text-xs text-vault-amber hover:underline"
                  >
                    Play all
                  </button>
                )}
                {queueTracks.length > 0 && (
                  <button
                    type="button"
                    onClick={clearQueue}
                    className={
                      setMode
                        ? "text-xs text-stone-500 hover:text-red-400"
                        : "text-xs text-vault-muted hover:text-vault-red"
                    }
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {queueTracks.length === 0 ? (
              <p
                className={
                  setMode
                    ? "px-4 py-8 text-center text-xs leading-relaxed text-stone-500"
                    : "px-4 py-6 text-center text-xs text-vault-muted"
                }
              >
                {setMode ? (
                  <>
                    Queue is empty. Exit set mode and hit{" "}
                    <kbd className="rounded border border-white/10 px-1 font-mono text-stone-400">
                      q
                    </kbd>{" "}
                    on tracks to build the set.
                  </>
                ) : (
                  <>
                    Queue is empty. Hit{" "}
                    <kbd className="rounded border border-vault-border px-1 font-mono">
                      q
                    </kbd>{" "}
                    on a selected track, or use{" "}
                    <span className="text-vault-text">Queue all matching</span>.
                  </>
                )}
              </p>
            ) : setMode ? (
              <ol className="max-h-[min(50vh,28rem)] divide-y divide-white/5 overflow-y-auto lg:max-h-[calc(100vh-8rem)]">
                {queueTracks.map((t, i) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-white/5"
                  >
                    <span className="w-5 shrink-0 font-mono text-xs text-stone-600">
                      {i + 1}
                    </span>
                    <img
                      src={youtubeThumbUrl(t.youtubeId)}
                      alt=""
                      className="h-10 w-16 shrink-0 rounded object-cover"
                      loading="lazy"
                    />
                    <button
                      type="button"
                      onClick={() => play(t.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm font-medium text-stone-100">
                        {t.title}
                      </span>
                      <span className="block truncate text-xs text-stone-500">
                        {t.artist}
                        <span className="text-stone-700"> · </span>
                        {t.genre}
                      </span>
                    </button>
                    <span
                      className={`shrink-0 font-mono text-[11px] ${
                        t.score > 0
                          ? "text-emerald-400"
                          : t.score < 0
                            ? "text-red-400"
                            : "text-stone-600"
                      }`}
                    >
                      {t.score > 0 ? `+${t.score}` : t.score}
                    </span>
                    <button
                      type="button"
                      onClick={() => dequeue(t.id)}
                      className="min-h-8 min-w-8 shrink-0 text-stone-600 hover:text-red-400"
                      aria-label={`Remove ${t.title} from queue`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <ol className="max-h-64 divide-y divide-vault-border/60 overflow-y-auto sm:max-h-72">
                {queueTracks.map((t, i) => (
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
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
