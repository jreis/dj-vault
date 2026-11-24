import { useState } from "react"
import { useToastStore } from "../store/useToastStore"
import { useVaultStore } from "../store/useVaultStore"

export function PlaylistStrip({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const playlists = useVaultStore((s) => s.playlists)
  const tracks = useVaultStore((s) => s.tracks)
  const nowPlayingId = useVaultStore((s) => s.nowPlayingId)
  const queue = useVaultStore((s) => s.queue)
  const saveQueueAsPlaylist = useVaultStore((s) => s.saveQueueAsPlaylist)
  const showToast = useToastStore((s) => s.show)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const canSave = [nowPlayingId, ...queue].some(
    (id) => id && tracks.some((track) => track.id === id),
  )

  function save() {
    const playlist = saveQueueAsPlaylist(
      name.trim() || `Set ${new Date().toLocaleDateString()}`,
      description.trim() || undefined,
    )
    if (!playlist) {
      showToast("Nothing to save — play or queue a song first.", "error")
      return
    }
    setName("")
    setDescription("")
    setOpen(false)
    onSelect(playlist.id)
    showToast(`Saved “${playlist.name}”`, "success")
  }

  return (
    <div className="mb-3 space-y-2">
      <div className="flex items-center gap-2">
        <div
          className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto"
          role="tablist"
          aria-label="Playlists"
        >
          <Chip pressed={selectedId === null} onClick={() => onSelect(null)}>
            All
          </Chip>
          {playlists.map((playlist) => (
            <Chip
              key={playlist.id}
              pressed={selectedId === playlist.id}
              onClick={() => onSelect(playlist.id)}
            >
              {playlist.name}
            </Chip>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="shrink-0 rounded-full border border-vault-border px-3 py-1 text-xs text-vault-muted hover:border-vault-amber hover:text-vault-amber"
        >
          Save queue
        </button>
      </div>
      {open && (
        <form
          className="flex flex-col gap-2 rounded-lg border border-vault-border bg-vault-surface p-2 sm:flex-row sm:items-center"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Playlist name"
            maxLength={80}
            aria-label="Playlist name"
            className="min-w-0 flex-1 rounded-md border border-vault-border bg-vault-elevated px-2 py-1.5 text-sm outline-none focus:border-vault-amber"
          />
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Dedication (optional)"
            maxLength={200}
            aria-label="Dedication"
            className="min-w-0 flex-1 rounded-md border border-vault-border bg-vault-elevated px-2 py-1.5 text-sm outline-none focus:border-vault-amber"
          />
          <button
            type="submit"
            disabled={!canSave}
            className="rounded-md bg-vault-amber px-3 py-1.5 text-sm font-medium text-stone-950 disabled:opacity-40"
          >
            Save
          </button>
        </form>
      )}
    </div>
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
      role="tab"
      aria-selected={pressed}
      onClick={onClick}
      className={`max-w-48 shrink-0 truncate rounded-full px-3 py-1 text-xs ${
        pressed
          ? "bg-vault-amber font-medium text-stone-950"
          : "bg-vault-elevated text-vault-muted hover:text-vault-text"
      }`}
    >
      {children}
    </button>
  )
}
