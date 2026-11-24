import { useEffect, useRef } from "react"
import { SEED_PLAYLISTS } from "../data/seedPlaylists"
import { Vote } from "./bits"
import { findPlaylist } from "./room"
import type { Room } from "./ListeningRoomPrototype"
import type { Track } from "../types"

export function VariantTape({ room }: { room: Room }) {
  const searchRef = useRef<HTMLInputElement>(null)
  const playlist = findPlaylist(room.setId)
  const set: Track[] = room.nowPlaying ? [room.nowPlaying, ...room.queue] : room.queue
  const addable = room.query.trim()
    ? room.tracks.filter((track) => {
        const inSet = set.some((item) => item.id === track.id)
        if (inSet) return false
        const needle = room.query.trim().toLowerCase()
        return `${track.title} ${track.artist}`.toLowerCase().includes(needle)
      })
    : []

  useEffect(() => {
    if (room.searchNonce === 0) return
    searchRef.current?.focus()
  }, [room.searchNonce])

  return (
    <div className="mx-auto min-h-svh max-w-xl px-5 pt-12 pb-40">
      <p className="font-mono text-[11px] tracking-[0.22em] text-vault-muted">TONIGHT&apos;S SET</p>
      <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-1" aria-label="Sets">
        <SetLink pressed={room.setId === null} onClick={() => room.loadSet(null)}>
          Top of the vault
        </SetLink>
        {SEED_PLAYLISTS.map((item) => (
          <SetLink
            key={item.id}
            pressed={room.setId === item.id}
            onClick={() => room.loadSet(item.id)}
          >
            {item.name}
          </SetLink>
        ))}
      </nav>

      <h1
        className="mt-8 text-4xl leading-tight text-vault-text"
        style={{ fontFamily: 'Georgia, "Iowan Old Style", Palatino, serif' }}
      >
        {playlist?.name ?? "Top of the vault"}
      </h1>
      <p className="mt-2 text-sm text-vault-muted">
        {playlist?.description ?? "The songs in this set, in the order you will hear them."}
      </p>
      <p className="mt-1 text-xs text-vault-muted">
        {set.length} song{set.length === 1 ? "" : "s"}
      </p>

      <ol className="mt-8">
        {set.map((track, index) => {
          const playing = track.id === room.nowPlaying?.id
          const selected = track.id === room.selectedId
          return (
            <li
              key={`${track.id}-${index}`}
              data-room-selected={selected ? "" : undefined}
              onClick={() => room.select(track.id)}
              onDoubleClick={() => room.play(track.id)}
              className={`flex cursor-pointer items-center gap-3 border-t border-vault-border py-3 ${
                playing ? "text-vault-amber" : ""
              }`}
            >
              <span className="w-6 font-mono text-xs text-vault-muted">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base">{track.title}</p>
                <p className="truncate text-xs text-vault-muted">{track.artist}</p>
              </div>
              <Vote
                score={track.score}
                onUp={() => room.vote(track.id, 1)}
                onDown={() => room.vote(track.id, -1)}
              />
              {index === 0 ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    room.toggle()
                  }}
                  className="w-14 text-xs text-vault-muted hover:text-vault-text"
                >
                  {room.playing ? "Pause" : "Play"}
                </button>
              ) : (
                <button
                  type="button"
                  aria-label={`Remove ${track.title} from the set`}
                  onClick={(event) => {
                    event.stopPropagation()
                    room.toggleQueue(track.id)
                  }}
                  className="w-14 text-xs text-vault-muted hover:text-vault-text"
                >
                  Remove
                </button>
              )}
            </li>
          )
        })}
      </ol>

      <div className="mt-8">
        <label className="block text-xs text-vault-muted" htmlFor="tape-add">
          Add a song from the vault
        </label>
        <input
          id="tape-add"
          ref={searchRef}
          data-room-search=""
          value={room.query}
          onChange={(event) => room.setQuery(event.target.value)}
          placeholder="Type a title or artist"
          className="mt-1 w-full border-b border-vault-border bg-transparent py-2 text-base outline-none placeholder:text-vault-muted focus:border-vault-amber"
        />
        {addable.length > 0 && (
          <ul className="mt-2 border border-vault-border">
            {addable.slice(0, 6).map((track) => (
              <li key={track.id}>
                <button
                  type="button"
                  onClick={() => {
                    room.toggleQueue(track.id)
                    room.setQuery("")
                    room.ping(`Added ${track.title} to the set.`)
                  }}
                  className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-vault-elevated"
                >
                  <span className="truncate">{track.title}</span>
                  <span className="shrink-0 text-xs text-vault-muted">{track.artist}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function SetLink({
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
      onClick={onClick}
      className={`text-sm ${pressed ? "text-vault-amber" : "text-vault-muted hover:text-vault-text"}`}
    >
      {children}
    </button>
  )
}
