import { useState, useRef } from "react"
import { createShareLink } from "../lib/shareApi"
import { useToastStore } from "../store/useToastStore"
import { useVaultStore } from "../store/useVaultStore"
import type { Playlist, Track } from "../types"

function setTrackList(s: {
  tracks: Track[]
  nowPlayingId: string | null
  queue: string[]
  guestTracks: Track[]
}): Track[] {
  const resolve = (id: string) =>
    s.tracks.find((t) => t.id === id) ??
    s.guestTracks.find((t) => t.id === id)
  const ids = [
    ...(s.nowPlayingId ? [s.nowPlayingId] : []),
    ...s.queue.filter((id) => id !== s.nowPlayingId),
  ]
  return ids
    .map((id) => resolve(id))
    .filter((t): t is Track => Boolean(t))
}

export function PlaylistPanel() {
  const playlists = useVaultStore((s) => s.playlists)
  const tracks = useVaultStore((s) => s.tracks)
  const nowPlayingId = useVaultStore((s) => s.nowPlayingId)
  const queue = useVaultStore((s) => s.queue)
  const guestTracks = useVaultStore((s) => s.guestTracks)
  const saveQueueAsPlaylist = useVaultStore((s) => s.saveQueueAsPlaylist)
  const playPlaylist = useVaultStore((s) => s.playPlaylist)
  const deletePlaylist = useVaultStore((s) => s.deletePlaylist)
  const renamePlaylist = useVaultStore((s) => s.renamePlaylist)
  const updatePlaylistDescription = useVaultStore((s) => s.updatePlaylistDescription)
  const updatePlaylistTracks = useVaultStore((s) => s.updatePlaylistTracks)
  const exportPlaylists = useVaultStore((s) => s.exportPlaylists)
  const importPlaylists = useVaultStore((s) => s.importPlaylists)
  const showToast = useToastStore((s) => s.show)

  const [nameDraft, setNameDraft] = useState("")
  const [descriptionDraft, setDescriptionDraft] = useState("")
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState("")
  const [editingDescId, setEditingDescId] = useState<string | null>(null)
  const [descEditDraft, setDescEditDraft] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentSet = setTrackList({
    tracks,
    nowPlayingId,
    queue,
    guestTracks,
  })
  const librarySetCount = currentSet.filter((t) =>
    tracks.some((lib) => lib.id === t.id),
  ).length

  function saveCurrent() {
    const name = nameDraft.trim() || `Set ${new Date().toLocaleDateString()}`
    const description = descriptionDraft.trim() || undefined
    const pl = saveQueueAsPlaylist(name, description)
    if (!pl) {
      showToast(
        "Nothing to save — play or queue library tracks first.",
        "error",
      )
      return
    }
    setNameDraft("")
    setDescriptionDraft("")
    showToast(`Saved playlist "${pl.name}" (${pl.trackIds.length})`, "success")
  }

  async function sharePlaylist(pl: Playlist) {
    const list = pl.trackIds
      .map((id) => tracks.find((t) => t.id === id))
      .filter((t): t is Track => Boolean(t))
    if (list.length === 0) {
      showToast("Playlist has no tracks left in the library.", "error")
      return
    }
    const result = await createShareLink(list, { name: pl.name })
    if (!result.ok) {
      showToast(result.error, "error")
      return
    }
    try {
      await navigator.clipboard.writeText(result.url)
      showToast(
        result.short
          ? `Short link copied — "${pl.name}" (${list.length})`
          : `Share link copied — "${pl.name}" (${list.length})`,
        "success",
      )
    } catch {
      window.prompt("Copy this share link:", result.url)
      showToast("Share link ready — paste it anywhere.", "info")
    }
  }

  function overwriteFromQueue(pl: Playlist) {
    const ids = currentSet
      .filter((t) => tracks.some((lib) => lib.id === t.id))
      .map((t) => t.id)
    if (ids.length === 0) {
      showToast("Queue library tracks first.", "error")
      return
    }
    updatePlaylistTracks(pl.id, ids)
    showToast(`Updated "${pl.name}" (${ids.length} tracks)`, "success")
  }

  function commitRename(id: string) {
    const name = renameDraft.trim()
    if (name) renamePlaylist(id, name)
    setRenamingId(null)
    setRenameDraft("")
  }

  function commitDescEdit(id: string) {
    updatePlaylistDescription(id, descEditDraft)
    setEditingDescId(null)
    setDescEditDraft("")
  }

  function handleExport() {
    try {
      const json = exportPlaylists()
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `djvault-playlists-${new Date().toISOString().split("T")[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast("Playlists exported successfully", "success")
    } catch (err) {
      showToast("Export failed", "error")
    }
  }

  function handleImport() {
    fileInputRef.current?.click()
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = reader.result as string
        const success = importPlaylists(json)
        if (success) {
          showToast("Playlists imported successfully", "success")
        } else {
          showToast("Import failed - invalid file format", "error")
        }
      } catch {
        showToast("Import failed - invalid file", "error")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  return (
    <div className="overflow-hidden rounded-xl border border-vault-border bg-vault-surface shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-vault-border px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-vault-muted">
          Playlists{" "}
          <span className="font-mono text-vault-amber">{playlists.length}</span>
        </h2>
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-vault-muted/70">
            Auto-saved to this device
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={playlists.length === 0}
            className="rounded border border-vault-border px-2 py-0.5 text-[10px] text-vault-blue hover:border-vault-blue disabled:opacity-40"
            title="Export playlists as backup file"
          >
            Backup
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="rounded border border-vault-border px-2 py-0.5 text-[10px] text-vault-muted hover:border-vault-amber hover:text-vault-amber"
            title="Import playlists from backup file"
          >
            Restore
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFileSelected}
        className="hidden"
      />

      <div className="space-y-3 p-3">
        <div className="space-y-2 rounded-lg border border-vault-border/50 bg-vault-elevated/30 p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  saveCurrent()
                }
              }}
              placeholder="Playlist name…"
              maxLength={80}
              className="min-w-0 flex-1 rounded-lg border border-vault-border bg-vault-surface px-2.5 py-1.5 text-xs text-vault-text placeholder:text-vault-muted/50 focus:border-vault-amber focus:outline-none"
            />
            <button
              type="button"
              onClick={saveCurrent}
              disabled={librarySetCount === 0}
              className="rounded-lg bg-vault-amber px-2.5 py-1.5 text-xs font-medium text-stone-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
              title="Save now-playing + queue as a named playlist"
            >
              Save queue
            </button>
          </div>
          <textarea
            value={descriptionDraft}
            onChange={(e) => setDescriptionDraft(e.target.value)}
            placeholder="Optional: Add a dedication or description…"
            maxLength={200}
            rows={2}
            className="w-full resize-none rounded-lg border border-vault-border bg-vault-surface px-2.5 py-1.5 text-xs text-vault-text placeholder:text-vault-muted/50 focus:border-vault-amber focus:outline-none"
          />
        </div>

        {playlists.length === 0 ? (
          <div className="rounded-lg border border-vault-border/50 bg-vault-elevated/30 px-4 py-8 text-center">
            <p className="text-xs font-medium text-vault-text">
              No saved playlists yet
            </p>
            <p className="mt-1 text-[11px] text-vault-muted">
              Build a queue, name it, and hit{" "}
              <span className="text-vault-amber">Save queue</span>.
            </p>
            <p className="mt-2 text-[10px] text-vault-muted/70">
              Your playlists are saved automatically to this browser and stay
              safe across sessions.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {playlists.map((pl) => {
              const count = pl.trackIds.filter((id) =>
                tracks.some((t) => t.id === id),
              ).length
              const renaming = renamingId === pl.id
              const editingDesc = editingDescId === pl.id
              const createdDate = new Date(pl.createdAt).toLocaleDateString()
              return (
                <li
                  key={pl.id}
                  className="overflow-hidden rounded-lg border border-vault-border bg-vault-elevated/50 shadow-sm"
                >
                  <div className="flex flex-wrap items-start gap-2 px-3 py-2.5 sm:flex-nowrap">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {renaming ? (
                        <input
                          type="text"
                          value={renameDraft}
                          autoFocus
                          maxLength={80}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onBlur={() => commitRename(pl.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              commitRename(pl.id)
                            }
                            if (e.key === "Escape") {
                              setRenamingId(null)
                              setRenameDraft("")
                            }
                          }}
                          className="w-full rounded border border-vault-border bg-vault-surface px-2 py-1 text-sm text-vault-text focus:border-vault-amber focus:outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(pl.id)
                            setRenameDraft(pl.name)
                          }}
                          className="block w-full truncate text-left text-sm font-semibold text-vault-text hover:text-vault-amber"
                          title="Click to rename"
                        >
                          {pl.name}
                        </button>
                      )}

                      {editingDesc ? (
                        <textarea
                          value={descEditDraft}
                          autoFocus
                          maxLength={200}
                          rows={2}
                          onChange={(e) => setDescEditDraft(e.target.value)}
                          onBlur={() => commitDescEdit(pl.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              setEditingDescId(null)
                              setDescEditDraft("")
                            }
                          }}
                          className="w-full resize-none rounded border border-vault-border bg-vault-surface px-2 py-1 text-xs text-vault-muted focus:border-vault-amber focus:outline-none"
                          placeholder="Add a dedication or description…"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDescId(pl.id)
                            setDescEditDraft(pl.description || "")
                          }}
                          className="block w-full text-left text-xs italic text-vault-muted/80 hover:text-vault-muted"
                          title="Click to add or edit description"
                        >
                          {pl.description || "Add a dedication or description…"}
                        </button>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-vault-muted/70">
                        <span className="font-mono">
                          <span className="text-vault-amber">{count}</span> track
                          {count === 1 ? "" : "s"}
                          {count !== pl.trackIds.length && (
                            <span className="text-vault-muted/60">
                              {" "}
                              · {pl.trackIds.length - count} missing
                            </span>
                          )}
                        </span>
                        <span>Created {createdDate}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={count === 0}
                        onClick={() => {
                          playPlaylist(pl.id)
                          showToast(`Playing "${pl.name}"`, "info")
                        }}
                        className="rounded-md border border-vault-border px-2 py-1 text-[11px] text-vault-amber hover:border-vault-amber disabled:opacity-40"
                      >
                        Play
                      </button>
                      <button
                        type="button"
                        disabled={count === 0}
                        onClick={() => void sharePlaylist(pl)}
                        className="rounded-md border border-vault-border px-2 py-1 text-[11px] text-vault-blue hover:border-vault-blue disabled:opacity-40"
                      >
                        Share
                      </button>
                      <button
                        type="button"
                        disabled={librarySetCount === 0}
                        onClick={() => overwriteFromQueue(pl)}
                        className="rounded-md border border-vault-border px-2 py-1 text-[11px] text-vault-muted hover:text-vault-text disabled:opacity-40"
                        title="Replace playlist tracks with current queue"
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete playlist "${pl.name}"?`)) {
                            deletePlaylist(pl.id)
                            showToast("Playlist deleted", "info")
                          }
                        }}
                        className="rounded-md border border-vault-border px-2 py-1 text-[11px] text-vault-muted hover:border-vault-red hover:text-vault-red"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
