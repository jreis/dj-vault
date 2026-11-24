import { useEffect, useRef, useState } from "react"
import { SEED_PLAYLISTS } from "../data/seedPlaylists"
import { Art, Vote } from "./bits"
import { artUrl } from "./room"
import type { Room } from "./ListeningRoomPrototype"

export function VariantStage({ room }: { room: Room }) {
  const searchRef = useRef<HTMLInputElement>(null)
  const [drawer, setDrawer] = useState(false)
  const song = room.nowPlaying

  useEffect(() => {
    if (room.searchNonce === 0) return
    setDrawer(true)
  }, [room.searchNonce])

  useEffect(() => {
    if (!drawer) return
    searchRef.current?.focus()
  }, [drawer, room.searchNonce])

  return (
    <div className="relative min-h-svh">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {song && (
          <div
            className="absolute inset-0 scale-110 bg-cover bg-center opacity-40 blur-3xl"
            style={{ backgroundImage: `url(${artUrl(song.youtubeId)})` }}
          />
        )}
        <div className="absolute inset-0 bg-vault-bg/80" />
      </div>

      <div className="relative flex min-h-svh flex-col pb-36">
        <header className="flex items-center justify-between px-4 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white hover:bg-white/10"
          >
            Open vault
          </button>
          <p className="text-xs tracking-[0.2em] text-white/70">DJ VAULT</p>
          <button
            type="button"
            onClick={room.startRadio}
            className="rounded-full border border-vault-amber/60 px-4 py-1.5 text-sm text-vault-amber"
          >
            Radio
          </button>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          {song ? (
            <>
              <Art
                youtubeId={song.youtubeId}
                alt=""
                className="mb-6 h-32 w-32 rounded-full object-cover shadow-2xl sm:h-44 sm:w-44"
              />
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
                {song.title}
              </h1>
              <p className="mt-3 text-lg text-white/70 sm:text-2xl">{song.artist}</p>
              <div className="mt-6 flex items-center gap-6">
                <Vote
                  score={song.score}
                  onUp={() => room.vote(song.id, 1)}
                  onDown={() => room.vote(song.id, -1)}
                />
                <button
                  type="button"
                  onClick={room.prev}
                  className="text-sm text-white/70 hover:text-white"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={room.toggle}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-lg font-semibold text-black"
                >
                  {room.playing ? "II" : "▶"}
                </button>
                <button
                  type="button"
                  onClick={room.next}
                  className="text-sm text-white/70 hover:text-white"
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="text-2xl text-white/80"
            >
              Open the vault and pick a song
            </button>
          )}
        </main>

        <section className="px-4 sm:px-8" aria-label="Up next">
          <p className="mb-2 text-[11px] tracking-[0.18em] text-white/50">UP NEXT</p>
          <div className="flex gap-3 overflow-x-auto">
            {room.queue.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => room.play(track.id)}
                className="w-36 shrink-0 text-left"
              >
                <Art
                  youtubeId={track.youtubeId}
                  alt=""
                  className="aspect-video w-full rounded object-cover"
                />
                <p className="mt-1 truncate text-sm">{track.title}</p>
                <p className="truncate text-xs text-white/50">{track.artist}</p>
              </button>
            ))}
            {room.queue.length === 0 && (
              <p className="text-sm text-white/50">Nothing queued. Radio will fill this.</p>
            )}
          </div>
        </section>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-30 flex">
          <div className="flex h-full w-full max-w-md flex-col bg-vault-bg shadow-2xl">
            <div className="flex items-center gap-2 border-b border-vault-border px-4 py-3">
              <input
                ref={searchRef}
                data-room-search=""
                value={room.query}
                onChange={(event) => room.setQuery(event.target.value)}
                placeholder="Search the vault"
                aria-label="Search the vault"
                className="min-w-0 flex-1 rounded-md border border-vault-border bg-vault-surface px-3 py-2 text-base outline-none sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setDrawer(false)}
                className="px-2 text-sm text-vault-muted"
              >
                Close
              </button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto px-4 py-2">
              <button
                type="button"
                onClick={() => room.setPlaylist(null)}
                className={`shrink-0 text-xs ${room.playlistId === null ? "text-vault-amber" : "text-vault-muted"}`}
              >
                All
              </button>
              {SEED_PLAYLISTS.map((playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => room.setPlaylist(playlist.id)}
                  className={`shrink-0 text-xs ${room.playlistId === playlist.id ? "text-vault-amber" : "text-vault-muted"}`}
                >
                  {playlist.name}
                </button>
              ))}
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto pb-8">
              {room.visible.map((track) => (
                <li key={track.id}>
                  <button
                    type="button"
                    data-room-selected={track.id === room.selectedId ? "" : undefined}
                    onClick={() => {
                      room.play(track.id)
                      setDrawer(false)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-vault-elevated"
                  >
                    <Art
                      youtubeId={track.youtubeId}
                      alt=""
                      className="h-10 w-16 shrink-0 rounded object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{track.title}</span>
                      <span className="block truncate text-xs text-vault-muted">
                        {track.artist} · {track.score}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            aria-label="Close vault"
            className="hidden flex-1 bg-black/50 sm:block"
            onClick={() => setDrawer(false)}
          />
        </div>
      )}
    </div>
  )
}
