import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useToastStore } from "../store/useToastStore"
import { useVaultStore } from "../store/useVaultStore"
import { DiscoveryPanel } from "./DiscoveryPanel"
import { MusicProfile } from "./MusicProfile"
import { Toolbar } from "./Toolbar"

export function VaultMenu() {
  const [open, setOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const playlists = useVaultStore((s) => s.playlists)
  const exportPlaylists = useVaultStore((s) => s.exportPlaylists)
  const importPlaylists = useVaultStore((s) => s.importPlaylists)
  const showToast = useToastStore((s) => s.show)
  const userLists = playlists.filter((playlist) => !playlist.curated)

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  function backup() {
    const json = exportPlaylists()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `djvault-playlists-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast("Playlists exported", "success")
  }

  function restore(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const ok = importPlaylists(String(reader.result))
      showToast(
        ok ? "Playlists imported" : "Import failed — invalid file",
        ok ? "success" : "error",
      )
    }
    reader.readAsText(file)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-9 rounded-lg border border-vault-border bg-vault-elevated px-2.5 py-1.5 text-sm text-vault-muted transition hover:border-vault-amber/50 hover:text-vault-text"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Menu
      </button>
      {open &&
        createPortal(
        <div className="fixed inset-0 z-[80] flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Library menu"
            className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-vault-border bg-vault-bg p-4 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Library</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded px-2 py-1 text-sm text-vault-muted hover:text-vault-text"
              >
                Close
              </button>
            </div>
            <Toolbar compact />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={backup}
                disabled={userLists.length === 0}
                className="rounded-lg border border-vault-border px-2.5 py-1.5 text-xs text-vault-muted hover:border-vault-blue hover:text-vault-blue disabled:opacity-40"
              >
                Backup playlists
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-vault-border px-2.5 py-1.5 text-xs text-vault-muted hover:border-vault-amber hover:text-vault-amber"
              >
                Restore playlists
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) restore(file)
                  event.target.value = ""
                }}
              />
            </div>
            <div className="mt-4 space-y-3">
              <DiscoveryPanel
                defaultExpanded
                onNavigate={() => setOpen(false)}
              />
              <MusicProfile defaultExpanded />
            </div>
          </div>
        </div>,
          document.body,
        )}
    </>
  )
}
