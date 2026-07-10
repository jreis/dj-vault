import { useMemo } from "react"
import {
  findSimilarTracks,
  youtubeArtistSearchUrl,
  youtubeSimilarSearchUrl,
} from "../lib/similarTracks"
import { youtubeThumbUrl } from "../lib/youtube"
import { useVaultStore } from "../store/useVaultStore"

export function SimilarTracks() {
  const tracks = useVaultStore((s) => s.tracks)
  const similarToId = useVaultStore((s) => s.similarToId)
  const setSimilarTo = useVaultStore((s) => s.setSimilarTo)
  const play = useVaultStore((s) => s.play)
  const enqueue = useVaultStore((s) => s.enqueue)
  const playSet = useVaultStore((s) => s.playSet)
  const enqueueMany = useVaultStore((s) => s.enqueueMany)
  const queue = useVaultStore((s) => s.queue)

  const seed = useMemo(
    () => tracks.find((t) => t.id === similarToId) ?? null,
    [tracks, similarToId],
  )

  const matches = useMemo(
    () => (seed ? findSimilarTracks(seed, tracks, 10) : []),
    [seed, tracks],
  )

  if (!seed) return null

  const matchIds = matches.map((m) => m.track.id)

  return (
    <section
      className="mb-5 overflow-hidden rounded-xl border border-vault-blue/30 bg-vault-surface shadow-lg"
      aria-label={`Tracks similar to ${seed.title}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-vault-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-vault-blue">
            Similar in vault
          </h2>
          <p className="mt-0.5 truncate text-sm text-vault-text">
            Like{" "}
            <span className="font-medium text-vault-amber">
              {seed.title}
            </span>
            <span className="text-vault-muted"> — {seed.artist}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-vault-muted/80">
            Ranked by genre, era, year, artist, and DJ notes · no API key
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
          Find more on YouTube ↗
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

      {matches.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-vault-muted">
          <p>No close matches in your vault yet.</p>
          <p className="mt-1 text-xs text-vault-muted/70">
            Add more tracks in the same genre/era, or search YouTube above.
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
    </section>
  )
}
