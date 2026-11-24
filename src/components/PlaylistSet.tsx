import { useState } from "react"
import { SEED_TRACKS } from "../data/seedTracks"
import { visibleSetSongs } from "../lib/filterTracks"
import { seedsForPlaylist, tracksForPlaylist } from "../lib/playlistPlayback"
import { createShareLink } from "../lib/shareApi"
import { useToastStore } from "../store/useToastStore"
import { useVaultStore } from "../store/useVaultStore"
import type { Playlist, Track } from "../types"

export function PlaylistSet({ playlist }: { playlist: Playlist }) {
  const tracks = useVaultStore((s) => s.tracks)
  const heldTracks = useVaultStore((s) => s.heldTracks)
  const publishedSeeds = useVaultStore((s) => s.publishedSeeds)
  const guestTracks = useVaultStore((s) => s.guestTracks)
  const previewTrack = useVaultStore((s) => s.previewTrack)
  const nowPlayingId = useVaultStore((s) => s.nowPlayingId)
  const isPlaying = useVaultStore((s) => s.isPlaying)
  const queue = useVaultStore((s) => s.queue)
  const playPlaylist = useVaultStore((s) => s.playPlaylist)
  const playSet = useVaultStore((s) => s.playSet)
  const vote = useVaultStore((s) => s.vote)
  const select = useVaultStore((s) => s.select)
  const selectedId = useVaultStore((s) => s.selectedId)
  const renamePlaylist = useVaultStore((s) => s.renamePlaylist)
  const updatePlaylistDescription = useVaultStore(
    (s) => s.updatePlaylistDescription,
  )
  const updatePlaylistTracks = useVaultStore((s) => s.updatePlaylistTracks)
  const deletePlaylist = useVaultStore((s) => s.deletePlaylist)
  const showToast = useToastStore((s) => s.show)
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(playlist.name)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState(playlist.description ?? "")

  const filters = useVaultStore((s) => s.filters)
  const songs = tracksForPlaylist(playlist.trackIds, {
    library: tracks,
    held: heldTracks,
    seeds: seedsForPlaylist(publishedSeeds, SEED_TRACKS),
    guestTracks,
    previewTrack,
  })
  const shown = visibleSetSongs(songs, filters)

  function commitName() {
    const next = nameDraft.trim()
    if (next) renamePlaylist(playlist.id, next)
    setRenaming(false)
  }

  function commitDesc() {
    updatePlaylistDescription(playlist.id, descDraft)
    setEditingDesc(false)
  }

  function playFrom(songId: string) {
    const index = songs.findIndex((song) => song.id === songId)
    const ids = songs.slice(index < 0 ? 0 : index).map((song) => song.id)
    if (ids.length === 0) return
    playSet(ids)
    const first = ids[0]
    if (first) select(first)
  }

  async function share() {
    if (songs.length === 0) {
      showToast("This set has no songs left to play.", "error")
      return
    }
    const result = await createShareLink(songs, { name: playlist.name })
    if (!result.ok) {
      showToast(result.error, "error")
      return
    }
    try {
      await navigator.clipboard.writeText(result.url)
      showToast(`Link copied — “${playlist.name}”`, "success")
    } catch {
      window.prompt("Copy this share link:", result.url)
    }
  }

  function replaceWithQueue() {
    const ids = [nowPlayingId, ...queue].filter(
      (id): id is string =>
        Boolean(id) && tracks.some((track) => track.id === id),
    )
    const unique = [...new Set(ids)]
    if (unique.length === 0) {
      showToast("Queue library songs first.", "error")
      return
    }
    updatePlaylistTracks(playlist.id, unique)
    showToast(`Updated “${playlist.name}”`, "success")
  }

  return (
    <article aria-label={playlist.name}>
      <header className="mb-4">
        {renaming && !playlist.curated ? (
          <input
            value={nameDraft}
            autoFocus
            maxLength={80}
            aria-label="Playlist name"
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                commitName()
              }
              if (event.key === "Escape") setRenaming(false)
            }}
            className="w-full border-b border-vault-border bg-transparent text-3xl font-semibold outline-none focus:border-vault-amber"
          />
        ) : (
          <h2 className="text-3xl font-semibold tracking-tight">
            {playlist.curated ? (
              playlist.name
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNameDraft(playlist.name)
                  setRenaming(true)
                }}
                className="text-left hover:text-vault-amber"
                title="Rename"
              >
                {playlist.name}
              </button>
            )}
          </h2>
        )}
        {editingDesc && !playlist.curated ? (
          <textarea
            value={descDraft}
            autoFocus
            maxLength={200}
            rows={2}
            aria-label="Dedication"
            onChange={(event) => setDescDraft(event.target.value)}
            onBlur={commitDesc}
            onKeyDown={(event) => {
              if (event.key === "Escape") setEditingDesc(false)
            }}
            className="mt-2 w-full resize-none border-b border-vault-border bg-transparent text-sm text-vault-muted outline-none focus:border-vault-amber"
          />
        ) : (
          <button
            type="button"
            disabled={playlist.curated}
            onClick={() => {
              setDescDraft(playlist.description ?? "")
              setEditingDesc(true)
            }}
            className="mt-2 block text-left text-sm italic text-vault-muted disabled:cursor-default"
          >
            {playlist.description ||
              (playlist.curated ? "" : "Add a dedication")}
          </button>
        )}
        <p className="mt-2 text-xs text-vault-muted">
          {shown.length === songs.length
            ? `${songs.length} song${songs.length === 1 ? "" : "s"}`
            : `${shown.length} of ${songs.length} songs`}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={songs.length === 0}
            onClick={() => {
              playPlaylist(playlist.id)
              showToast(`Playing “${playlist.name}”`, "info")
            }}
            className="rounded-md bg-vault-amber px-3 py-1.5 text-sm font-medium text-stone-950 disabled:opacity-40"
          >
            Play set
          </button>
          <button
            type="button"
            disabled={songs.length === 0}
            onClick={() => void share()}
            className="rounded-md border border-vault-border px-3 py-1.5 text-sm text-vault-muted hover:text-vault-text disabled:opacity-40"
          >
            Share
          </button>
          {!playlist.curated && (
            <>
              <button
                type="button"
                onClick={replaceWithQueue}
                className="rounded-md border border-vault-border px-3 py-1.5 text-sm text-vault-muted hover:text-vault-text"
              >
                Replace with queue
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete playlist “${playlist.name}”?`)) {
                    deletePlaylist(playlist.id)
                    showToast("Playlist deleted", "info")
                  }
                }}
                className="rounded-md border border-vault-border px-3 py-1.5 text-sm text-vault-muted hover:text-vault-red"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </header>
      <ol>
        {shown.map((song, index) => (
          <SetRow
            key={song.id}
            song={song}
            index={index}
            playing={song.id === nowPlayingId}
            paused={!isPlaying}
            selected={song.id === selectedId}
            curated={Boolean(playlist.curated)}
            onSelect={() => select(song.id)}
            onPlay={() => playFrom(song.id)}
            onVote={(delta) => vote(song.id, delta)}
            onRemove={() =>
              updatePlaylistTracks(
                playlist.id,
                playlist.trackIds.filter((id) => id !== song.id),
              )
            }
          />
        ))}
      </ol>
      {shown.length === 0 && (
        <p className="py-8 text-sm text-vault-muted">
          {songs.length === 0
            ? "This set is empty."
            : "Nothing in this set matches the filter."}
        </p>
      )}
    </article>
  )
}

function SetRow({
  song,
  index,
  playing,
  paused,
  selected,
  curated,
  onSelect,
  onPlay,
  onVote,
  onRemove,
}: {
  song: Track
  index: number
  playing: boolean
  paused: boolean
  selected: boolean
  curated: boolean
  onSelect: () => void
  onPlay: () => void
  onVote: (delta: 1 | -1) => void
  onRemove: () => void
}) {
  return (
    <li
      data-track-id={song.id}
      data-selected={selected || undefined}
      data-cursor={selected || undefined}
      className={`flex items-center gap-3 border-t border-vault-border py-2.5 ${
        playing ? "text-vault-amber" : ""
      } ${selected ? "bg-vault-elevated/60" : ""}`}
      onClick={onSelect}
      onDoubleClick={onPlay}
    >
      <span className="w-6 text-right font-mono text-xs text-vault-muted">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{song.title}</p>
        <p className="truncate text-xs text-vault-muted">{song.artist}</p>
      </div>
      <div className="flex flex-col items-center leading-none">
        <button
          type="button"
          aria-label={`Upvote ${song.title}`}
          onClick={(event) => {
            event.stopPropagation()
            onVote(1)
          }}
          className="px-1 text-[10px] text-vault-muted hover:text-vault-green"
        >
          ▲
        </button>
        <span className="text-sm tabular-nums">{song.score}</span>
        <button
          type="button"
          aria-label={`Downvote ${song.title}`}
          onClick={(event) => {
            event.stopPropagation()
            onVote(-1)
          }}
          className="px-1 text-[10px] text-vault-muted hover:text-vault-red"
        >
          ▼
        </button>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onPlay()
        }}
        className="w-14 text-xs text-vault-muted hover:text-vault-text"
      >
        {playing ? (paused ? "Play" : "Playing") : "Play"}
      </button>
      {!curated && (
        <button
          type="button"
          aria-label={`Remove ${song.title} from the set`}
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          className="text-xs text-vault-muted hover:text-vault-red"
        >
          Remove
        </button>
      )}
    </li>
  )
}
