import { useEffect, useMemo, useRef, useState } from "react"
import { filterAndSortTracks } from "../lib/filterTracks"
import { youtubeThumbUrl } from "../lib/youtube"
import {
  guessTrackMeta,
  youtubeWebSearchUrl,
} from "../lib/guessTrackMeta"
import {
  DiscoverError,
  searchYouTubeVideos,
  type DiscoverVideo,
} from "../lib/youtubeDiscover"
import { useVaultStore } from "../store/useVaultStore"
import { useToastStore } from "../store/useToastStore"

type SearchStatus = "idle" | "loading" | "ready" | "error"

export function YoutubeSearchPanel() {
  const tracks = useVaultStore((s) => s.tracks)
  const filters = useVaultStore((s) => s.filters)
  const filtersQuery = filters.query
  const youtubeSearchQuery = useVaultStore((s) => s.youtubeSearchQuery)
  const youtubeSearchSeq = useVaultStore((s) => s.youtubeSearchSeq)
  const requestYoutubeSearch = useVaultStore((s) => s.requestYoutubeSearch)
  const clearYoutubeSearch = useVaultStore((s) => s.clearYoutubeSearch)
  const addTrack = useVaultStore((s) => s.addTrack)
  const playPreview = useVaultStore((s) => s.playPreview)
  const enqueueNext = useVaultStore((s) => s.enqueueNext)
  const nowPlayingId = useVaultStore((s) => s.nowPlayingId)
  const previewTrack = useVaultStore((s) => s.previewTrack)
  const showToast = useToastStore((s) => s.show)

  const [status, setStatus] = useState<SearchStatus>("idle")
  const [results, setResults] = useState<DiscoverVideo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  const vaultMatchCount = useMemo(
    () => filterAndSortTracks(tracks, filters).length,
    [tracks, filters],
  )

  const activeQuery = youtubeSearchQuery?.trim() ?? ""
  const typedQuery = filtersQuery.trim()
  const vaultMiss = typedQuery.length > 0 && vaultMatchCount === 0

  const vaultYtIds = useMemo(
    () => new Set(tracks.map((t) => t.youtubeId)),
    [tracks],
  )
  const excludeRef = useRef(vaultYtIds)
  excludeRef.current = vaultYtIds

  const visibleResults = useMemo(
    () => results.filter((v) => !vaultYtIds.has(v.youtubeId)),
    [results, vaultYtIds],
  )

  useEffect(() => {
    if (!activeQuery) return
    document
      .getElementById("youtube-search-panel")
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [activeQuery])

  useEffect(() => {
    if (!activeQuery) {
      setStatus("idle")
      setResults([])
      setError(null)
      setErrorCode(null)
      return
    }

    const ac = new AbortController()
    setStatus("loading")
    setError(null)
    setErrorCode(null)

    searchYouTubeVideos(activeQuery, excludeRef.current, ac.signal)
      .then((res) => {
        if (ac.signal.aborted) return
        setResults(res.items)
        setStatus("ready")
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        if (err instanceof DiscoverError) {
          setError(err.message)
          setErrorCode(err.code)
        } else {
          setError("Could not search YouTube")
          setErrorCode("upstream")
        }
        setStatus("error")
      })

    return () => ac.abort()
  }, [activeQuery, youtubeSearchSeq])

  function scrollToPlayer() {
    queueMicrotask(() => {
      document
        .querySelector('[aria-label="Player and queue"]')
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    })
  }

  function previewVideo(video: DiscoverVideo) {
    const meta = guessTrackMeta({
      query: activeQuery || typedQuery,
      videoTitle: video.title,
      channelTitle: video.channelTitle,
    })
    const existing = tracks.find((t) => t.youtubeId === video.youtubeId)
    playPreview({
      ...meta,
      youtubeId: video.youtubeId,
      notes: `Preview from YouTube search “${activeQuery || typedQuery}”`,
    })
    if (existing) {
      showToast(`Playing “${existing.title}”`, "info")
    } else {
      showToast(`Previewing “${meta.title}” — not in the vault yet`, "info")
    }
    scrollToPlayer()
  }

  function addVideo(video: DiscoverVideo, mode: "add" | "queue") {
    if (vaultYtIds.has(video.youtubeId)) {
      const existing = tracks.find((t) => t.youtubeId === video.youtubeId)
      if (existing) {
        enqueueNext(existing.id)
        showToast(`Already in vault — queued “${existing.title}”`, "info")
      } else {
        showToast("Already in your vault", "info")
      }
      return
    }

    setAddingId(video.youtubeId)
    const meta = guessTrackMeta({
      query: activeQuery || typedQuery,
      videoTitle: video.title,
      channelTitle: video.channelTitle,
    })
    const track = addTrack({
      ...meta,
      youtubeId: video.youtubeId,
      notes: `Found via YouTube search “${activeQuery || typedQuery}”`,
    })
    setAddingId(null)

    if (mode === "queue") {
      const playingThis =
        useVaultStore.getState().nowPlayingId === track.id
      if (!playingThis) enqueueNext(track.id)
      showToast(
        playingThis
          ? `Added “${meta.title}” to the vault`
          : nowPlayingId
            ? `Added — up next: “${meta.title}”`
            : `Added & queued “${meta.title}”`,
        "success",
      )
    } else {
      showToast(`Added “${meta.title}” to the vault`, "success")
    }
  }

  // Prompt only on a vault miss. Results show after an explicit YouTube search
  // (Enter in the search box, or the button) — including when the vault already
  // has matches and the user wants more.
  if (!activeQuery && !vaultMiss) return null

  const showPrompt = !activeQuery && vaultMiss
  const showManualFallback =
    errorCode === "quota_exceeded" ||
    errorCode === "disabled" ||
    errorCode === "missing_key"

  return (
    <section
      id="youtube-search-panel"
      className="mb-4 overflow-hidden rounded-xl border border-vault-amber/30 bg-vault-surface shadow-lg"
      aria-label="Search YouTube"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-vault-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-vault-amber">
            Search YouTube
          </h2>
          <p className="mt-0.5 text-sm text-vault-text">
            {showPrompt ? (
              <>
                Nothing in the vault for{" "}
                <span className="font-medium text-vault-amber">
                  “{typedQuery}”
                </span>
              </>
            ) : activeQuery ? (
              <>
                Results for{" "}
                <span className="font-medium text-vault-amber">
                  “{activeQuery}”
                </span>
              </>
            ) : (
              "Find a track and add it to the vault"
            )}
          </p>
          <p className="mt-0.5 text-[11px] text-vault-muted/80">
            Preview to listen first. Add keeps it in the vault. Genre and year
            are guessed — edit later if needed.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {showPrompt && (
            <button
              type="button"
              onClick={() => requestYoutubeSearch(typedQuery)}
              className="rounded-lg bg-vault-amber px-2.5 py-1 text-xs font-medium text-stone-950 hover:bg-amber-400"
            >
              Search YouTube
            </button>
          )}
          {activeQuery && (
            <button
              type="button"
              onClick={clearYoutubeSearch}
              className="rounded-lg border border-vault-border px-2.5 py-1 text-xs text-vault-muted hover:text-vault-text"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {showPrompt && (
        <p className="px-4 py-3 text-xs text-vault-muted">
          Press{" "}
          <kbd className="rounded border border-vault-border px-1 font-mono">
            Enter
          </kbd>{" "}
          in the search box, or click Search YouTube.
        </p>
      )}

      {status === "loading" && (
        <div className="px-4 py-6 text-center text-sm text-vault-muted">
          Searching YouTube for “{activeQuery}”…
        </div>
      )}

      {status === "error" && (
        <div className="px-4 py-5 text-center text-sm text-vault-muted">
          <p>{error}</p>
          {showManualFallback && (
            <p className="mt-1 text-xs text-vault-muted/70">
              YouTube search isn’t available right now.{" "}
              <a
                href={youtubeWebSearchUrl(activeQuery || typedQuery)}
                target="_blank"
                rel="noreferrer"
                className="text-vault-amber underline underline-offset-2 hover:text-vault-text"
              >
                Open YouTube ↗
              </a>{" "}
              and paste a link via Add track.
            </p>
          )}
        </div>
      )}

      {status === "ready" && visibleResults.length === 0 && (
        <p className="px-4 py-5 text-center text-sm text-vault-muted">
          No new videos. Try a more specific query, or{" "}
          <a
            href={youtubeWebSearchUrl(activeQuery)}
            target="_blank"
            rel="noreferrer"
            className="text-vault-amber underline underline-offset-2 hover:text-vault-text"
          >
            search YouTube ↗
          </a>
          .
        </p>
      )}

      {visibleResults.length > 0 && (
        <ul className="divide-y divide-vault-border/60">
          {visibleResults.map((video) => {
            const meta = guessTrackMeta({
              query: activeQuery,
              videoTitle: video.title,
              channelTitle: video.channelTitle,
            })
            const busy = addingId === video.youtubeId
            const isPreviewing = previewTrack?.youtubeId === video.youtubeId
            return (
              <li
                key={video.youtubeId}
                className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:flex-nowrap sm:px-4"
              >
                <button
                  type="button"
                  onClick={() => previewVideo(video)}
                  className="relative h-10 w-16 shrink-0 overflow-hidden rounded bg-vault-elevated"
                  title="Preview"
                  aria-label={`Preview ${meta.title}`}
                >
                  <img
                    src={video.thumbnailUrl || youtubeThumbUrl(video.youtubeId)}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-[10px] font-semibold text-white">
                    ▶
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-vault-text">
                    {meta.title}
                    {isPreviewing && (
                      <span className="ml-1.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-vault-amber">
                        Previewing
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-vault-muted">
                    {meta.artist}
                    <span className="text-vault-border"> · </span>
                    {meta.genre}
                    <span className="text-vault-border"> · </span>
                    {meta.year}
                  </p>
                </div>
                <div className="flex w-full gap-1.5 sm:w-auto sm:shrink-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => previewVideo(video)}
                    aria-pressed={isPreviewing}
                    className={`min-h-8 flex-1 rounded-md border px-2 py-1 text-xs disabled:opacity-40 sm:flex-none ${
                      isPreviewing
                        ? "border-vault-amber bg-vault-amber/15 text-vault-amber"
                        : "border-vault-border text-vault-amber hover:border-vault-amber"
                    }`}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => addVideo(video, "queue")}
                    className="min-h-8 flex-1 rounded-md border border-vault-border px-2 py-1 text-xs text-vault-blue hover:border-vault-blue disabled:opacity-40 sm:flex-none"
                  >
                    Queue
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => addVideo(video, "add")}
                    className="min-h-8 flex-1 rounded-md border border-vault-border px-2 py-1 text-xs text-vault-muted hover:border-vault-amber hover:text-vault-amber disabled:opacity-40 sm:flex-none"
                  >
                    Add
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
