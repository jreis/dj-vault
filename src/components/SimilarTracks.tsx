import { useEffect, useMemo, useState } from "react"
import {
  findSimilarTracks,
  youtubeArtistSearchUrl,
  youtubeSimilarSearchUrl,
} from "../lib/similarTracks"
import { youtubeThumbUrl, youtubeWatchUrl } from "../lib/youtube"
import {
  DiscoverError,
  fetchSimilarVideos,
  guessTitleArtist,
  type DiscoverVideo,
} from "../lib/youtubeDiscover"
import { useVaultStore } from "../store/useVaultStore"
import { useToastStore } from "../store/useToastStore"

export function SimilarTracks() {
  const tracks = useVaultStore((s) => s.tracks)
  const similarToId = useVaultStore((s) => s.similarToId)
  const setSimilarTo = useVaultStore((s) => s.setSimilarTo)
  const play = useVaultStore((s) => s.play)
  const enqueue = useVaultStore((s) => s.enqueue)
  const playSet = useVaultStore((s) => s.playSet)
  const enqueueMany = useVaultStore((s) => s.enqueueMany)
  const queue = useVaultStore((s) => s.queue)
  const addTrack = useVaultStore((s) => s.addTrack)
  const showToast = useToastStore((s) => s.show)

  const seed = useMemo(
    () => tracks.find((t) => t.id === similarToId) ?? null,
    [tracks, similarToId],
  )

  const matches = useMemo(
    () => (seed ? findSimilarTracks(seed, tracks, 10) : []),
    [seed, tracks],
  )

  const vaultYtIds = useMemo(
    () => new Set(tracks.map((t) => t.youtubeId)),
    [tracks],
  )

  const [discover, setDiscover] = useState<DiscoverVideo[]>([])
  const [discoverQuery, setDiscoverQuery] = useState("")
  const [discoverStatus, setDiscoverStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle")
  const [discoverError, setDiscoverError] = useState<string | null>(null)
  const [discoverCode, setDiscoverCode] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    if (!seed) {
      setDiscover([])
      setDiscoverQuery("")
      setDiscoverStatus("idle")
      setDiscoverError(null)
      setDiscoverCode(null)
      return
    }

    const ac = new AbortController()
    setDiscoverStatus("loading")
    setDiscoverError(null)
    setDiscoverCode(null)
    setDiscover([])

    const library = useVaultStore.getState().tracks
    fetchSimilarVideos(seed, library, ac.signal)
      .then((res) => {
        if (ac.signal.aborted) return
        setDiscover(res.items)
        setDiscoverQuery(res.query)
        setDiscoverStatus("ready")
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        if (err instanceof DiscoverError) {
          setDiscoverError(err.message)
          setDiscoverCode(err.code)
        } else {
          setDiscoverError("Could not load YouTube suggestions")
          setDiscoverCode("upstream")
        }
        setDiscoverStatus("error")
      })

    return () => ac.abort()
  }, [seed])

  if (!seed) return null

  const matchIds = matches.map((m) => m.track.id)

  function addDiscovered(
    video: DiscoverVideo,
    mode: "queue" | "play" = "queue",
  ) {
    if (!seed) return
    if (vaultYtIds.has(video.youtubeId)) {
      const existing = tracks.find((t) => t.youtubeId === video.youtubeId)
      if (existing) {
        if (mode === "play") {
          play(existing.id)
          showToast(`Playing “${existing.title}”`, "info")
        } else if (!queue.includes(existing.id)) {
          enqueue(existing.id)
          showToast(`Queued “${existing.title}”`, "info")
        } else {
          showToast("Already in your vault and queue", "info")
        }
      } else {
        showToast("Already in your vault", "info")
      }
      return
    }
    setAddingId(video.youtubeId)
    const { title, artist } = guessTitleArtist(
      video.title,
      video.channelTitle,
    )
    const track = addTrack({
      title,
      artist,
      youtubeId: video.youtubeId,
      genre: seed.genre,
      era: seed.era,
      year: seed.year,
      notes: `Discovered via similar to “${seed.title}”`,
    })
    setDiscover((prev) => prev.filter((v) => v.youtubeId !== video.youtubeId))
    setAddingId(null)
    if (mode === "play") {
      play(track.id)
      showToast(`Added & playing “${title}”`, "success")
    } else {
      enqueue(track.id)
      showToast(`Added & queued “${title}”`, "success")
    }
  }

  return (
    <section
      className="mb-5 overflow-hidden rounded-xl border border-vault-blue/30 bg-vault-surface shadow-lg"
      aria-label={`Tracks similar to ${seed.title}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-vault-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-vault-blue">
            Similar
          </h2>
          <p className="mt-0.5 truncate text-sm text-vault-text">
            Like{" "}
            <span className="font-medium text-vault-amber">{seed.title}</span>
            <span className="text-vault-muted"> — {seed.artist}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-vault-muted/80">
            In-vault matches + YouTube discovery
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSimilarTo(null)}
          className="shrink-0 rounded-lg border border-vault-border px-2.5 py-1 text-xs text-vault-muted hover:text-vault-text"
        >
          Close
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-vault-border/60 px-4 py-2.5 text-xs">
        {matchIds.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => playSet([seed.id, ...matchIds])}
              className="rounded-md border border-vault-border bg-vault-elevated px-2.5 py-1 font-medium text-vault-amber hover:border-vault-amber"
            >
              Play seed + similar
            </button>
            <button
              type="button"
              onClick={() => enqueueMany(matchIds)}
              className="rounded-md border border-vault-border px-2.5 py-1 text-vault-muted hover:border-vault-blue hover:text-vault-blue"
            >
              Queue all similar
            </button>
          </>
        )}
        <a
          href={youtubeSimilarSearchUrl(seed)}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-vault-border px-2.5 py-1 text-vault-muted hover:border-vault-blue hover:text-vault-blue"
        >
          YouTube search ↗
        </a>
        <a
          href={youtubeArtistSearchUrl(seed)}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-vault-border px-2.5 py-1 text-vault-muted hover:border-vault-blue hover:text-vault-blue"
        >
          More by {seed.artist} ↗
        </a>
      </div>

      {/* —— In vault —— */}
      <div className="border-b border-vault-border/60">
        <h3 className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-vault-muted">
          In vault
          {matches.length > 0 && (
            <span className="ml-1.5 font-normal normal-case tracking-normal">
              · ranked by genre, era, year, artist, notes
            </span>
          )}
        </h3>
        {matches.length === 0 ? (
          <div className="px-4 py-5 text-center text-sm text-vault-muted">
            <p>No close matches in your vault yet.</p>
            <p className="mt-1 text-xs text-vault-muted/70">
              Add discoveries below, or grow the library in the same genre/era.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-vault-border/60">
            {matches.map(({ track, score, reasons }) => {
              const queued = queue.includes(track.id)
              return (
                <li
                  key={track.id}
                  className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:flex-nowrap sm:px-4"
                >
                  <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded bg-vault-elevated">
                    <img
                      src={youtubeThumbUrl(track.youtubeId)}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-vault-text">
                        {track.title}
                      </span>
                      <span className="shrink-0 rounded bg-vault-blue/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-vault-blue">
                        {score}%
                      </span>
                    </div>
                    <p className="truncate text-xs text-vault-muted">
                      {track.artist} · {track.year} · {track.genre}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-vault-muted/70">
                      {reasons.join(" · ")}
                    </p>
                  </div>
                  <div className="flex w-full gap-1.5 sm:w-auto sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => play(track.id)}
                      className="min-h-8 flex-1 rounded-md border border-vault-border px-2 py-1 text-xs text-vault-amber hover:border-vault-amber sm:flex-none"
                    >
                      Play
                    </button>
                    <button
                      type="button"
                      onClick={() => enqueue(track.id)}
                      disabled={queued}
                      className="min-h-8 flex-1 rounded-md border border-vault-border px-2 py-1 text-xs text-vault-muted hover:border-vault-blue hover:text-vault-blue disabled:opacity-40 sm:flex-none"
                    >
                      Queue
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimilarTo(track.id)}
                      className="min-h-8 flex-1 rounded-md border border-vault-border px-2 py-1 text-xs text-vault-muted hover:text-vault-text sm:flex-none"
                      title="Find similar to this track instead"
                    >
                      Similar
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* —— New on YouTube —— */}
      <div>
        <h3 className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-vault-muted">
          New on YouTube
          {discoverQuery && discoverStatus === "ready" && (
            <span
              className="ml-1.5 font-normal normal-case tracking-normal text-vault-muted/70"
              title={discoverQuery}
            >
              · not already in vault
            </span>
          )}
        </h3>

        {discoverStatus === "loading" && (
          <div className="px-4 py-6 text-center text-sm text-vault-muted">
            Searching YouTube for similar tracks…
          </div>
        )}

        {discoverStatus === "error" && (
          <div className="px-4 py-5 text-center text-sm text-vault-muted">
            <p>{discoverError}</p>
            {discoverCode === "missing_key" ? (
              <p className="mt-1 text-xs text-vault-muted/70">
                Set{" "}
                <code className="rounded bg-vault-elevated px-1 py-0.5 text-[10px]">
                  YOUTUBE_API_KEY
                </code>{" "}
                in Cloudflare Pages (or{" "}
                <code className="rounded bg-vault-elevated px-1 py-0.5 text-[10px]">
                  .env.local
                </code>{" "}
                for local dev). External search links still work above.
              </p>
            ) : discoverCode === "quota_exceeded" ? (
              <p className="mt-1 text-xs text-vault-muted/70">
                Free YouTube API quota is used up for today — discovery is
                paused so you don&apos;t get billed. Vault matches and the
                YouTube search links above still work. Resets midnight Pacific.
              </p>
            ) : discoverCode === "disabled" ? (
              <p className="mt-1 text-xs text-vault-muted/70">
                Discovery is turned off via{" "}
                <code className="rounded bg-vault-elevated px-1 py-0.5 text-[10px]">
                  YOUTUBE_DISCOVERY_ENABLED
                </code>
                . Vault matches and external search links still work.
              </p>
            ) : (
              <p className="mt-1 text-xs text-vault-muted/70">
                Use the YouTube links above, or try again later.
              </p>
            )}
          </div>
        )}

        {discoverStatus === "ready" && discover.length === 0 && (
          <div className="px-4 py-5 text-center text-sm text-vault-muted">
            <p>No new embeddable music results (or all were already in vault).</p>
            <p className="mt-1 text-xs text-vault-muted/70">
              Try the YouTube search link above for a wider net.
            </p>
          </div>
        )}

        {discoverStatus === "ready" && discover.length > 0 && (
          <ul className="divide-y divide-vault-border/60">
            {discover.map((video) => {
              const { title, artist } = guessTitleArtist(
                video.title,
                video.channelTitle,
              )
              const busy = addingId === video.youtubeId
              return (
                <li
                  key={video.youtubeId}
                  className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:flex-nowrap sm:px-4"
                >
                  <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded bg-vault-elevated">
                    <img
                      src={video.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-vault-text">
                      {title}
                    </p>
                    <p className="truncate text-xs text-vault-muted">
                      {artist}
                      {video.channelTitle && artist !== video.channelTitle && (
                        <span className="text-vault-muted/60">
                          {" "}
                          · {video.channelTitle}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-vault-muted/60">
                      inherits {seed.genre} · {seed.era} · {seed.year}
                    </p>
                  </div>
                  <div className="flex w-full gap-1.5 sm:w-auto sm:shrink-0">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => addDiscovered(video, "queue")}
                      className="min-h-8 flex-1 rounded-md border border-vault-border px-2 py-1 text-xs font-medium text-vault-blue hover:border-vault-blue disabled:opacity-40 sm:flex-none"
                      title="Add to vault and queue"
                    >
                      Add & queue
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => addDiscovered(video, "play")}
                      className="min-h-8 flex-1 rounded-md border border-vault-border bg-vault-elevated px-2 py-1 text-xs text-vault-amber hover:border-vault-amber disabled:opacity-40 sm:flex-none"
                      title="Add to vault and play now"
                    >
                      Add & play
                    </button>
                    <a
                      href={youtubeWatchUrl(video.youtubeId)}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-8 flex-1 rounded-md border border-vault-border px-2 py-1 text-center text-xs text-vault-muted hover:text-vault-text sm:flex-none"
                      title="Open on YouTube"
                    >
                      ↗
                    </a>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
