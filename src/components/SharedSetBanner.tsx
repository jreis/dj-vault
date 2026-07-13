import { useState } from "react"
import { clearShareHash } from "../lib/shareLink"
import { useToastStore } from "../store/useToastStore"
import { useVaultStore } from "../store/useVaultStore"

/**
 * Shown while a shared set is playing as a guest session (not yet in library).
 */
export function SharedSetBanner() {
  const guestTracks = useVaultStore((s) => s.guestTracks)
  const guestSetName = useVaultStore((s) => s.guestSetName)
  const importGuestSet = useVaultStore((s) => s.importGuestSet)
  const saveGuestAsPlaylist = useVaultStore((s) => s.saveGuestAsPlaylist)
  const clearGuestSet = useVaultStore((s) => s.clearGuestSet)
  const showToast = useToastStore((s) => s.show)
  const [showSave, setShowSave] = useState(false)
  const [saveName, setSaveName] = useState("")

  if (guestTracks.length === 0) return null

  const title = guestSetName?.trim() || "Shared set"

  function dismiss() {
    clearGuestSet()
    clearShareHash()
    showToast("Shared set dismissed", "info")
  }

  function merge() {
    importGuestSet("merge")
    clearShareHash()
    showToast(
      `Merged ${guestTracks.length} track${guestTracks.length === 1 ? "" : "s"} into library`,
      "success",
    )
  }

  function replace() {
    if (
      !confirm(
        "Replace your entire library with this shared set? Your current tracks and playlists will be cleared.",
      )
    ) {
      return
    }
    importGuestSet("replace")
    clearShareHash()
    showToast("Library replaced with shared set", "success")
  }

  function saveAsPlaylist() {
    const name =
      saveName.trim() ||
      guestSetName?.trim() ||
      `Shared ${new Date().toLocaleDateString()}`
    const pl = saveGuestAsPlaylist(name)
    if (!pl) {
      showToast("Could not save playlist.", "error")
      return
    }
    clearShareHash()
    setShowSave(false)
    showToast(`Saved “${pl.name}” and imported tracks`, "success")
  }

  return (
    <div
      className="border-b border-vault-blue/40 bg-vault-blue/10 px-4 py-3 text-sm"
      role="status"
      aria-label="Shared set playing"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-vault-text">
          Playing{" "}
          <span className="font-semibold text-vault-blue">“{title}”</span>
          {" · "}
          <span className="font-mono font-semibold text-vault-amber">
            {guestTracks.length}
          </span>{" "}
          track{guestTracks.length === 1 ? "" : "s"}
          <span className="text-vault-muted">
            {" "}
            (not in your library yet)
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {!showSave ? (
            <>
              <button
                type="button"
                onClick={merge}
                className="rounded-lg bg-vault-amber px-3 py-1.5 text-xs font-medium text-stone-950 hover:bg-amber-400"
              >
                Import to library
              </button>
              <button
                type="button"
                onClick={() => {
                  setSaveName(guestSetName ?? "")
                  setShowSave(true)
                }}
                className="rounded-lg border border-vault-border px-3 py-1.5 text-xs text-vault-text hover:border-vault-blue"
              >
                Save as playlist
              </button>
              <button
                type="button"
                onClick={replace}
                className="rounded-lg border border-vault-border px-3 py-1.5 text-xs text-vault-muted hover:border-vault-amber hover:text-vault-amber"
              >
                Replace library
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg border border-vault-border px-3 py-1.5 text-xs text-vault-muted hover:text-vault-red"
              >
                Dismiss
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    saveAsPlaylist()
                  }
                  if (e.key === "Escape") setShowSave(false)
                }}
                placeholder="Playlist name…"
                maxLength={80}
                autoFocus
                className="min-w-[10rem] flex-1 rounded-lg border border-vault-border bg-vault-elevated px-2.5 py-1.5 text-xs text-vault-text placeholder:text-vault-muted/50 focus:border-vault-blue focus:outline-none sm:max-w-xs"
              />
              <button
                type="button"
                onClick={saveAsPlaylist}
                className="rounded-lg bg-vault-amber px-3 py-1.5 text-xs font-medium text-stone-950 hover:bg-amber-400"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowSave(false)}
                className="rounded-lg border border-vault-border px-3 py-1.5 text-xs text-vault-muted"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
