import { useRef, useState } from "react"
import type { Track } from "../types"
import {
  buildShareUrl,
  clearShareHash,
  isShareUrlTooLong,
} from "../lib/shareLink"
import { useVaultStore } from "../store/useVaultStore"
import { useToastStore } from "../store/useToastStore"

export function Toolbar() {
  const tracks = useVaultStore((s) => s.tracks)
  const queue = useVaultStore((s) => s.queue)
  const nowPlayingId = useVaultStore((s) => s.nowPlayingId)
  const resetToSeed = useVaultStore((s) => s.resetToSeed)
  const importTracks = useVaultStore((s) => s.importTracks)
  const showToast = useToastStore((s) => s.show)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<Track[] | null>(null)

  function exportJson(source: "library" | "queue" | "set") {
    let list = tracks
    let label = "library"
    if (source === "queue") {
      const ids = [
        ...(nowPlayingId ? [nowPlayingId] : []),
        ...queue.filter((id) => id !== nowPlayingId),
      ]
      list = ids
        .map((id) => tracks.find((t) => t.id === id))
        .filter((t): t is Track => Boolean(t))
      label = "playlist"
    } else if (source === "set") {
      list = [...tracks].sort((a, b) => b.score - a.score)
      label = "set-by-score"
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      app: "dj-vault",
      version: 1,
      tracks: list,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `dj-vault-${label}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`Exported ${list.length} track${list.length === 1 ? "" : "s"}`, "success")
  }

  async function copyShareLink(source: "library" | "queue") {
    let list = tracks
    if (source === "queue") {
      const ids = [
        ...(nowPlayingId ? [nowPlayingId] : []),
        ...queue.filter((id) => id !== nowPlayingId),
      ]
      list = ids
        .map((id) => tracks.find((t) => t.id === id))
        .filter((t): t is Track => Boolean(t))
      if (list.length === 0) {
        showToast("Queue is empty — add tracks first.", "error")
        return
      }
    }

    const url = buildShareUrl(list)
    if (isShareUrlTooLong(url)) {
      showToast(
        "Link too long — use Export JSON for large libraries.",
        "error",
      )
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      showToast(
        `Share link copied (${list.length} track${list.length === 1 ? "" : "s"})`,
        "success",
      )
    } catch {
      window.prompt("Copy this share link:", url)
      showToast("Share link ready — paste it anywhere.", "info")
    }
  }

  function onImportFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as {
          tracks?: Track[]
        }
        const list = Array.isArray(data)
          ? (data as Track[])
          : Array.isArray(data.tracks)
            ? data.tracks
            : null
        if (!list || list.length === 0) {
          showToast("No tracks found in that file.", "error")
          return
        }
        setPendingImport(list)
      } catch {
        showToast("Could not parse JSON.", "error")
      }
    }
    reader.readAsText(file)
  }

  function confirmImport(mode: "merge" | "replace") {
    if (!pendingImport) return
    importTracks(pendingImport, mode)
    clearShareHash()
    showToast(
      mode === "merge"
        ? `Merged ${pendingImport.length} track(s)`
        : `Replaced library with ${pendingImport.length} track(s)`,
      "success",
    )
    setPendingImport(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-vault-muted/80">Export</span>
          <button
            type="button"
            onClick={() => exportJson("library")}
            className="rounded-lg border border-vault-border px-2.5 py-1.5 text-vault-muted hover:border-vault-amber hover:text-vault-amber"
            title="Download full library as JSON"
          >
            JSON
          </button>
          <button
            type="button"
            onClick={() => exportJson("queue")}
            className="rounded-lg border border-vault-border px-2.5 py-1.5 text-vault-muted hover:border-vault-amber hover:text-vault-amber"
            title="Download now-playing + queue as JSON"
          >
            Playlist JSON
          </button>
          <button
            type="button"
            onClick={() => void copyShareLink("library")}
            className="rounded-lg border border-vault-border px-2.5 py-1.5 text-vault-muted hover:border-vault-blue hover:text-vault-blue"
            title="Copy a URL that opens this library"
          >
            Share link
          </button>
          <button
            type="button"
            onClick={() => void copyShareLink("queue")}
            className="rounded-lg border border-vault-border px-2.5 py-1.5 text-vault-muted hover:border-vault-blue hover:text-vault-blue"
            title="Copy a URL for the current playlist"
          >
            Share playlist
          </button>
        </div>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-vault-border px-2.5 py-1.5 text-vault-muted hover:border-vault-blue hover:text-vault-blue"
        >
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onImportFile(f)
            e.target.value = ""
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (
              confirm(
                "Reset vault to the 20 seed tracks? Your votes and custom tracks will be lost.",
              )
            ) {
              resetToSeed()
              clearShareHash()
              showToast("Vault reset to seed library", "info")
            }
          }}
          className="rounded-lg border border-vault-border px-2.5 py-1.5 text-vault-muted hover:border-vault-red hover:text-vault-red"
        >
          Reset seed
        </button>

        <span className="ml-auto hidden text-vault-muted/70 lg:inline">
          <kbd className="rounded border border-vault-border px-1 font-mono">
            j
          </kbd>
          /
          <kbd className="rounded border border-vault-border px-1 font-mono">
            k
          </kbd>{" "}
          navigate ·{" "}
          <kbd className="rounded border border-vault-border px-1 font-mono">
            ↵
          </kbd>{" "}
          play ·{" "}
          <kbd className="rounded border border-vault-border px-1 font-mono">
            q
          </kbd>{" "}
          queue ·{" "}
          <kbd className="rounded border border-vault-border px-1 font-mono">
            f
          </kbd>{" "}
          set mode ·{" "}
          <kbd className="rounded border border-vault-border px-1 font-mono">
            ?
          </kbd>{" "}
          help
        </span>
      </div>

      {pendingImport && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Cancel import"
            onClick={() => setPendingImport(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-vault-border bg-vault-surface p-5 shadow-2xl">
            <h2
              id="import-title"
              className="text-sm font-semibold text-vault-text"
            >
              Import {pendingImport.length} track
              {pendingImport.length === 1 ? "" : "s"}?
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-vault-muted">
              <strong className="text-vault-text">Merge</strong> keeps your
              library and adds new IDs.{" "}
              <strong className="text-vault-text">Replace</strong> wipes the
              current vault first.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => confirmImport("merge")}
                className="rounded-lg bg-vault-amber px-3 py-2 text-xs font-medium text-stone-950 hover:bg-amber-400"
              >
                Merge
              </button>
              <button
                type="button"
                onClick={() => confirmImport("replace")}
                className="rounded-lg border border-vault-border px-3 py-2 text-xs text-vault-text hover:border-vault-amber"
              >
                Replace library
              </button>
              <button
                type="button"
                onClick={() => setPendingImport(null)}
                className="rounded-lg border border-vault-border px-3 py-2 text-xs text-vault-muted hover:text-vault-red"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
