import { useEffect, useRef, useState } from "react"
import { SEED_PLAYLISTS } from "../data/seedPlaylists"
import { Art, Vote } from "./bits"
import type { Room } from "./ListeningRoomPrototype"

const MENU = [
  "Share link",
  "Export JSON",
  "Import",
  "Save as seed",
  "Reset seed",
  "Clear tracks",
  "Discover artists",
  "Music profile",
] as const

export function VariantDeck({ room }: { room: Room }) {
  const searchRef = useRef<HTMLInputElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sheet, setSheet] = useState<(typeof MENU)[number] | null>(null)

  useEffect(() => {
    if (room.searchNonce === 0) return
    searchRef.current?.focus()
  }, [room.searchNonce])

  return (
    <div className="flex min-h-svh flex-col lg:h-svh">
      <header className="flex items-center gap-3 border-b border-vault-border px-3 py-3 sm:px-5">
        <div className="shrink-0 leading-tight">
          <p className="text-sm font-semibold">
            DJ <span className="text-vault-amber">Vault</span>
          </p>
          <p className="text-[11px] text-vault-muted">{room.visible.length} tracks</p>
        </div>
        <input
          ref={searchRef}
          data-room-search=""
          value={room.query}
          onChange={(event) => room.setQuery(event.target.value)}
          placeholder="Search the vault"
          aria-label="Search the vault"
          className="min-w-0 flex-1 rounded-md border border-vault-border bg-vault-surface px-3 py-2 text-base text-vault-text outline-none placeholder:text-vault-muted focus:border-vault-amber sm:text-sm"
        />
        <div className="relative">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-md border border-vault-border px-3 py-2 text-sm text-vault-muted hover:text-vault-text"
          >
            Menu
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-1 w-52 rounded-md border border-vault-border bg-vault-surface py-1 shadow-lg"
            >
              {MENU.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-sm text-vault-text hover:bg-vault-elevated"
                  onClick={() => {
                    setMenuOpen(false)
                    setSheet(item)
                    room.ping(`${item} opens from the menu.`)
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <section className="flex min-h-0 flex-col border-vault-border lg:border-r" aria-label="Library">
          <div className="flex gap-1.5 overflow-x-auto px-3 py-2 sm:px-5">
            <Chip
              pressed={room.playlistId === null}
              onClick={() => room.setPlaylist(null)}
            >
              All
            </Chip>
            {SEED_PLAYLISTS.map((playlist) => (
              <Chip
                key={playlist.id}
                pressed={room.playlistId === playlist.id}
                onClick={() => room.setPlaylist(playlist.id)}
              >
                {playlist.name}
              </Chip>
            ))}
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto pb-28">
            {room.visible.map((track) => {
              const playing = track.id === room.nowPlaying?.id
              const selected = track.id === room.selectedId
              const queued = room.queue.some((item) => item.id === track.id)
              return (
                <li key={track.id}>
                  <div
                    data-room-selected={selected ? "" : undefined}
                    onClick={() => room.select(track.id)}
                    onDoubleClick={() => room.play(track.id)}
                    className={`flex cursor-pointer items-center gap-3 border-b border-vault-border/70 px-3 py-2 sm:px-5 ${
                      selected ? "bg-vault-elevated" : "hover:bg-vault-surface"
                    } ${playing ? "border-l-2 border-l-vault-amber" : "border-l-2 border-l-transparent"}`}
                  >
                    <Vote
                      score={track.score}
                      onUp={() => room.vote(track.id, 1)}
                      onDown={() => room.vote(track.id, -1)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${playing ? "text-vault-amber" : "text-vault-text"}`}>
                        {track.title}
                      </p>
                      <p className="truncate text-xs text-vault-muted">
                        {track.artist}
                        <span className="mx-1.5 text-vault-border">·</span>
                        {track.genre}
                        <span className="mx-1.5 text-vault-border">·</span>
                        {track.year}
                      </p>
                      <div className="mt-1 flex gap-3 sm:hidden">
                        <RowActions playing={playing && room.playing} queued={queued} onPlay={() => room.play(track.id)} onQueue={() => room.toggleQueue(track.id)} />
                      </div>
                    </div>
                    <div className="hidden shrink-0 sm:flex">
                      <RowActions playing={playing && room.playing} queued={queued} onPlay={() => room.play(track.id)} onQueue={() => room.toggleQueue(track.id)} />
                    </div>
                  </div>
                </li>
              )
            })}
            {room.visible.length === 0 && (
              <li className="px-5 py-8 text-sm text-vault-muted">No tracks match.</li>
            )}
          </ul>
        </section>

        <aside className="min-h-0 overflow-y-auto border-t border-vault-border px-4 py-4 pb-28 lg:border-t-0" aria-label="Player and queue">
          {room.nowPlaying ? (
            <>
              <Art
                youtubeId={room.nowPlaying.youtubeId}
                alt=""
                className="aspect-video w-full rounded-md object-cover"
              />
              <h2 className="mt-3 text-lg font-semibold leading-tight">{room.nowPlaying.title}</h2>
              <p className="text-sm text-vault-muted">{room.nowPlaying.artist}</p>
              <Transport room={room} />
              <button
                type="button"
                onClick={room.startRadio}
                className="mt-3 w-full rounded-md border border-vault-amber/50 py-2 text-sm text-vault-amber hover:bg-vault-amber/10"
              >
                Radio from this song
              </button>
            </>
          ) : (
            <p className="text-sm text-vault-muted">Nothing playing. Press Enter on a row.</p>
          )}
          <h3 className="mt-5 text-xs font-medium tracking-wide text-vault-muted">
            QUEUE {room.queue.length}
          </h3>
          <ol className="mt-2">
            {room.queue.map((track, index) => (
              <li key={track.id} className="flex items-center gap-2 py-1.5 text-sm">
                <span className="w-4 text-xs text-vault-muted">{index + 1}</span>
                <button
                  type="button"
                  onClick={() => room.play(track.id)}
                  className="min-w-0 flex-1 truncate text-left hover:text-vault-amber"
                >
                  {track.title}
                  <span className="text-vault-muted"> · {track.artist}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${track.title} from queue`}
                  onClick={() => room.toggleQueue(track.id)}
                  className="text-xs text-vault-muted hover:text-vault-text"
                >
                  ×
                </button>
              </li>
            ))}
            {room.queue.length === 0 && (
              <li className="py-2 text-sm text-vault-muted">Queue is empty.</li>
            )}
          </ol>
        </aside>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-lg border border-vault-border bg-vault-surface p-5">
            <h2 className="text-lg font-semibold">{sheet}</h2>
            <p className="mt-2 text-sm leading-relaxed text-vault-muted">
              This stays in the product. It opens over the listening room, then gets out of the way. The home screen does not keep a card for it.
            </p>
            <button
              type="button"
              onClick={() => setSheet(null)}
              className="mt-4 rounded-md bg-vault-amber px-3 py-1.5 text-sm font-medium text-black"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RowActions({
  playing,
  queued,
  onPlay,
  onQueue,
}: {
  playing: boolean
  queued: boolean
  onPlay: () => void
  onQueue: () => void
}) {
  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onPlay()
        }}
        className="rounded px-1 py-1 text-xs text-vault-muted hover:text-vault-amber"
      >
        {playing ? "Playing" : "Play"}
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onQueue()
        }}
        className="rounded px-1 py-1 text-xs text-vault-muted hover:text-vault-text"
      >
        {queued ? "Queued" : "Queue"}
      </button>
    </>
  )
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1 text-xs ${
        pressed
          ? "bg-vault-amber text-black"
          : "bg-vault-elevated text-vault-muted hover:text-vault-text"
      }`}
    >
      {children}
    </button>
  )
}

function Transport({ room }: { room: Room }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <button type="button" onClick={room.prev} className="rounded border border-vault-border px-3 py-1.5 text-sm">
        Prev
      </button>
      <button
        type="button"
        onClick={room.toggle}
        className="rounded bg-vault-amber px-4 py-1.5 text-sm font-medium text-black"
      >
        {room.playing ? "Pause" : "Play"}
      </button>
      <button type="button" onClick={room.next} className="rounded border border-vault-border px-3 py-1.5 text-sm">
        Next
      </button>
    </div>
  )
}
