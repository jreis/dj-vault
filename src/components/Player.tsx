import { useMemo } from "react"
import { useVaultStore } from "../store/useVaultStore"
import { youtubeEmbedUrl, youtubeWatchUrl } from "../lib/youtube"

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

  const current = tracks.find((t) => t.id === nowPlayingId)
  const queueTracks = queue
    .map((id) => tracks.find((t) => t.id === id))
    .filter(Boolean)

  // Continuous multi-track embed: now playing + remaining queue YouTube IDs
  const playlistYtIds = useMemo(() => {
    return queue
      .map((id) => tracks.find((t) => t.id === id)?.youtubeId)
      .filter((id): id is string => Boolean(id))
  }, [queue, tracks])

  const setSize = (current ? 1 : 0) + queueTracks.length

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
            <div className="aspect-video w-full bg-black">
              <iframe
                key={`${current.youtubeId}-${playlistYtIds.join(",")}`}
                title={`${current.title} — ${current.artist}`}
                src={youtubeEmbedUrl(current.youtubeId, true, playlistYtIds)}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
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
              </div>
              {playlistYtIds.length > 0 && (
                <p className="text-[11px] text-vault-muted/80">
                  YouTube will auto-advance through the queue after this track.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-vault-elevated/50 p-6 text-center">
            <div className="text-3xl opacity-40" aria-hidden>
              ◎
            </div>
            <p className="text-sm text-vault-muted">Nothing playing</p>
            <p className="text-xs text-vault-muted/70">
              Select a track and press{" "}
              <kbd className="rounded border border-vault-border px-1 font-mono">
                Enter
              </kbd>{" "}
              or double-click
            </p>
            {queueTracks.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  playSet(
                    queueTracks
                      .map((t) => t?.id)
                      .filter((id): id is string => Boolean(id)),
                  )
                }
                className="mt-2 rounded-lg bg-vault-amber px-3 py-1.5 text-xs font-medium text-stone-950 hover:bg-amber-400"
              >
                Play queue ({queueTracks.length})
              </button>
            )}
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
