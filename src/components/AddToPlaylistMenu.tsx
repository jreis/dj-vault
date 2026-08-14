import { useState, useRef, useEffect } from "react"
import { useVaultStore } from "../store/useVaultStore"
import { useToastStore } from "../store/useToastStore"

interface AddToPlaylistMenuProps {
  trackId: string
  trackTitle: string
  /** Icon-only trigger — use in tight table rows. */
  compact?: boolean
}

export function AddToPlaylistMenu({
  trackId,
  trackTitle,
  compact = false,
}: AddToPlaylistMenuProps) {
  const allPlaylists = useVaultStore((s) => s.playlists)
  const playlists = allPlaylists.filter((pl) => !pl.curated)
  const addTrackToPlaylist = useVaultStore((s) => s.addTrackToPlaylist)
  const showToast = useToastStore((s) => s.show)
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  function handleAddToPlaylist(playlistId: string, playlistName: string) {
    addTrackToPlaylist(playlistId, trackId)
    showToast(`Added "${trackTitle}" to "${playlistName}"`, "success")
    setIsOpen(false)
  }

  if (playlists.length === 0) {
    return null
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={
          compact
            ? "rounded-md border border-vault-border px-2 py-1 text-xs text-vault-blue hover:border-vault-blue hover:text-vault-blue"
            : "rounded-lg border border-vault-border bg-vault-elevated px-2.5 py-1.5 text-xs text-vault-blue hover:border-vault-blue hover:bg-vault-blue/5"
        }
        title="Add to playlist"
      >
        {compact ? "+" : "+ Playlist"}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-vault-border bg-vault-surface shadow-xl">
          <div className="border-b border-vault-border px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-vault-muted">
              Add to playlist
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {playlists.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-vault-muted">No playlists yet</p>
                <p className="mt-1 text-[10px] text-vault-muted/70">
                  Save your first playlist to use this feature
                </p>
              </div>
            ) : (
              <ul>
                {playlists.map((pl) => {
                  const alreadyInPlaylist = pl.trackIds.includes(trackId)
                  return (
                    <li key={pl.id}>
                      <button
                        type="button"
                        onClick={() => !alreadyInPlaylist && handleAddToPlaylist(pl.id, pl.name)}
                        disabled={alreadyInPlaylist}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-vault-elevated disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="min-w-0 flex-1 truncate text-vault-text">
                          {pl.name}
                        </span>
                        {alreadyInPlaylist ? (
                          <span className="ml-2 shrink-0 text-[10px] text-vault-muted">
                            ✓ Added
                          </span>
                        ) : (
                          <span className="ml-2 shrink-0 text-[10px] text-vault-blue">
                            +
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
