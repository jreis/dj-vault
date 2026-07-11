import type { Track } from "../types"
import { useVaultStore } from "../store/useVaultStore"
import { youtubeThumbUrl } from "../lib/youtube"

interface TrackTableProps {
  tracks: Track[]
}

export function TrackTable({ tracks }: TrackTableProps) {
  const selectedId = useVaultStore((s) => s.selectedId)
  const nowPlayingId = useVaultStore((s) => s.nowPlayingId)
  const queue = useVaultStore((s) => s.queue)
  const select = useVaultStore((s) => s.select)
  const play = useVaultStore((s) => s.play)
  const vote = useVaultStore((s) => s.vote)
  const enqueue = useVaultStore((s) => s.enqueue)
  const removeTrack = useVaultStore((s) => s.removeTrack)
  const setSimilarTo = useVaultStore((s) => s.setSimilarTo)
  const similarToId = useVaultStore((s) => s.similarToId)

  if (tracks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-vault-border bg-vault-surface px-6 py-16 text-center">
        <p className="text-lg text-vault-amber/40" aria-hidden>
          ⌕
        </p>
        <p className="mt-2 font-medium text-vault-text">No tracks match</p>
        <p className="mt-1 text-sm text-vault-muted">
          Clear search or filters, or add a track with a YouTube link.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => useVaultStore.getState().clearFilters()}
            className="rounded-lg border border-vault-border px-3 py-1.5 text-xs text-vault-muted hover:border-vault-amber hover:text-vault-amber"
          >
            Clear filters
          </button>
          <button
            type="button"
            onClick={() => useVaultStore.getState().setShowAddForm(true)}
            className="rounded-lg bg-vault-amber px-3 py-1.5 text-xs font-medium text-stone-950 hover:bg-amber-400"
          >
            + Add track
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile card list */}
      <ul className="flex flex-col gap-2 md:hidden" aria-label="Track library">
        {tracks.map((track) => {
          const selected = track.id === selectedId
          const playing = track.id === nowPlayingId
          const queued = queue.includes(track.id)

          return (
            <li
              key={track.id}
              data-track-id={track.id}
              className={`track-row rounded-xl border border-vault-border bg-vault-surface p-3 shadow-sm transition-colors ${
                selected ? "ring-1 ring-vault-amber/50" : ""
              }`}
              data-selected={selected}
              onClick={() => select(track.id)}
            >
              <div className="flex gap-3">
                <div className="flex flex-col items-center gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      vote(track.id, 1)
                    }}
                    className="min-h-8 min-w-8 rounded text-vault-muted hover:bg-vault-elevated hover:text-vault-green"
                    aria-label={`Upvote ${track.title}`}
                  >
                    ▲
                  </button>
                  <span
                    className={`font-mono text-sm font-semibold tabular-nums ${
                      track.score > 0
                        ? "text-vault-green"
                        : track.score < 0
                          ? "text-vault-red"
                          : "text-vault-muted"
                    }`}
                  >
                    {track.score}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      vote(track.id, -1)
                    }}
                    className="min-h-8 min-w-8 rounded text-vault-muted hover:bg-vault-elevated hover:text-vault-red"
                    aria-label={`Downvote ${track.title}`}
                  >
                    ▼
                  </button>
                </div>

                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-vault-elevated">
                  <img
                    src={youtubeThumbUrl(track.youtubeId)}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  {playing && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-vault-amber">
                      <span className="now-playing-eq" aria-hidden>
                        <i />
                        <i />
                        <i />
                      </span>
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-medium text-vault-text">
                      {track.title}
                    </span>
                    {playing && (
                      <span className="shrink-0 rounded bg-vault-amber/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-vault-amber">
                        Now
                      </span>
                    )}
                    {queued && !playing && (
                      <span className="shrink-0 rounded bg-vault-blue/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-vault-blue">
                        Q
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-vault-muted">
                    {track.artist}
                    <span className="text-vault-border"> · </span>
                    {track.year}
                    <span className="text-vault-border"> · </span>
                    {track.genre}
                  </p>
                  {track.notes && (
                    <p className="mt-0.5 truncate text-xs text-vault-muted/70">
                      {track.notes}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        play(track.id)
                      }}
                      className="min-h-9 rounded-md border border-vault-border bg-vault-elevated px-3 py-1 text-xs font-medium text-vault-amber"
                    >
                      Play
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        enqueue(track.id)
                      }}
                      disabled={queued}
                      className="min-h-9 rounded-md border border-vault-border px-3 py-1 text-xs text-vault-muted disabled:opacity-40"
                    >
                      Queue
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSimilarTo(
                          similarToId === track.id ? null : track.id,
                        )
                      }}
                      className={`min-h-9 rounded-md border px-3 py-1 text-xs ${
                        similarToId === track.id
                          ? "border-vault-blue bg-vault-blue/15 text-vault-blue"
                          : "border-vault-border text-vault-muted hover:border-vault-blue hover:text-vault-blue"
                      }`}
                      title="Find similar tracks (s)"
                    >
                      Similar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (
                          confirm(`Remove “${track.title}” from the vault?`)
                        ) {
                          removeTrack(track.id)
                        }
                      }}
                      className="min-h-9 rounded-md border border-vault-border px-2 py-1 text-xs text-vault-muted hover:text-vault-red"
                      aria-label={`Remove ${track.title}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-vault-border bg-vault-surface shadow-lg md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-vault-border bg-vault-elevated/80 text-xs uppercase tracking-wide text-vault-muted">
                <th className="w-16 px-2 py-2.5 text-center font-medium">
                  Vote
                </th>
                <th className="px-3 py-2.5 font-medium">Track</th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell">
                  Genre
                </th>
                <th className="hidden px-3 py-2.5 font-medium sm:table-cell">
                  Era
                </th>
                <th className="hidden px-3 py-2.5 font-medium lg:table-cell">
                  Notes
                </th>
                <th className="px-3 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track) => {
                const selected = track.id === selectedId
                const playing = track.id === nowPlayingId
                const queued = queue.includes(track.id)

                return (
                  <tr
                    key={track.id}
                    data-track-id={track.id}
                    className="track-row border-b border-vault-border/60 transition-colors last:border-0"
                    data-selected={selected}
                    onClick={() => select(track.id)}
                    onDoubleClick={() => play(track.id)}
                  >
                    <td className="px-1 py-2 text-center align-middle">
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            vote(track.id, 1)
                          }}
                          className="rounded p-0.5 text-vault-muted hover:bg-vault-elevated hover:text-vault-green"
                          aria-label={`Upvote ${track.title}`}
                          title="Upvote (u)"
                        >
                          ▲
                        </button>
                        <span
                          className={`min-w-[1.5rem] font-mono text-sm font-semibold tabular-nums ${
                            track.score > 0
                              ? "text-vault-green"
                              : track.score < 0
                                ? "text-vault-red"
                                : "text-vault-muted"
                          }`}
                        >
                          {track.score}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            vote(track.id, -1)
                          }}
                          className="rounded p-0.5 text-vault-muted hover:bg-vault-elevated hover:text-vault-red"
                          aria-label={`Downvote ${track.title}`}
                          title="Downvote (d)"
                        >
                          ▼
                        </button>
                      </div>
                    </td>

                    <td className="px-3 py-2.5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded bg-vault-elevated">
                          <img
                            src={youtubeThumbUrl(track.youtubeId)}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                          {playing && (
                            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-vault-amber">
                              <span className="now-playing-eq" aria-hidden>
                                <i />
                                <i />
                                <i />
                              </span>
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-vault-text">
                              {track.title}
                            </span>
                            {playing && (
                              <span className="shrink-0 rounded bg-vault-amber/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-vault-amber">
                                Now
                              </span>
                            )}
                            {queued && !playing && (
                              <span className="shrink-0 rounded bg-vault-blue/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-vault-blue">
                                Q
                              </span>
                            )}
                          </div>
                          <div className="truncate text-vault-muted">
                            {track.artist}
                            <span className="text-vault-border"> · </span>
                            {track.year}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="hidden px-3 py-2.5 align-middle md:table-cell">
                      <span className="rounded-full border border-vault-border bg-vault-elevated px-2 py-0.5 text-xs text-vault-muted">
                        {track.genre}
                      </span>
                    </td>

                    <td className="hidden px-3 py-2.5 align-middle font-mono text-vault-muted sm:table-cell">
                      {track.era}
                    </td>

                    <td className="hidden max-w-[12rem] truncate px-3 py-2.5 align-middle text-vault-muted lg:table-cell">
                      {track.notes || "—"}
                    </td>

                    <td className="px-3 py-2.5 text-right align-middle">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            play(track.id)
                          }}
                          className="rounded-md border border-vault-border px-2 py-1 text-xs text-vault-text hover:border-vault-amber hover:text-vault-amber"
                          title="Play (Enter)"
                        >
                          Play
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            enqueue(track.id)
                          }}
                          disabled={queued}
                          className="rounded-md border border-vault-border px-2 py-1 text-xs text-vault-muted hover:border-vault-blue hover:text-vault-blue disabled:opacity-40"
                          title="Add to queue (q)"
                        >
                          Queue
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSimilarTo(
                              similarToId === track.id ? null : track.id,
                            )
                          }}
                          className={`rounded-md border px-2 py-1 text-xs ${
                            similarToId === track.id
                              ? "border-vault-blue bg-vault-blue/15 text-vault-blue"
                              : "border-vault-border text-vault-muted hover:border-vault-blue hover:text-vault-blue"
                          }`}
                          title="Find similar tracks (s)"
                        >
                          Similar
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (
                              confirm(
                                `Remove “${track.title}” from the vault?`,
                              )
                            ) {
                              removeTrack(track.id)
                            }
                          }}
                          className="rounded-md border border-vault-border px-2 py-1 text-xs text-vault-muted hover:border-vault-red hover:text-vault-red"
                          title="Remove"
                          aria-label={`Remove ${track.title}`}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
