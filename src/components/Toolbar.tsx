import { useRef, useState } from "react"
import type { Track } from "../types"
import {
  buildShareUrl,
  clearShareHash,
  isShareUrlTooLong,
} from "../lib/shareLink"
import { useVaultStore } from "../store/useVaultStore"

export function Toolbar() {
  const tracks = useVaultStore((s) => s.tracks)
  const queue = useVaultStore((s) => s.queue)
  const nowPlayingId = useVaultStore((s) => s.nowPlayingId)
  const resetToSeed = useVaultStore((s) => s.resetToSeed)
  const importTracks = useVaultStore((s) => s.importTracks)
  const fileRef = useRef<HTMLInputElement>(null)
  const [shareMsg, setShareMsg] = useState<string | null>(null)

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
      app: "reis-dj-vault",
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
  }

  async function copyShareLink(source: "library" | "queue") {
    setShareMsg(null)
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
        setShareMsg("Queue is empty — add tracks first.")
        return
      }
    }

    const url = buildShareUrl(list)
    if (isShareUrlTooLong(url)) {
      setShareMsg(
        "Link too long for a URL — use Export JSON instead for large libraries.",
      )
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      setShareMsg(
        `Copied share link (${list.length} track${list.length === 1 ? "" : "s"}).`,
      )
    } catch {
      // Fallback: prompt for manual copy
      window.prompt("Copy this share link:", url)
      setShareMsg("Share link ready — paste it anywhere.")
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
          alert("No tracks found in that file.")
          return
        }
        const choice = window.prompt(
          `Import ${list.length} tracks.\nType "merge" or "replace":`,
          "merge",
        )
        if (choice === null) return
        const mode =
          choice.trim().toLowerCase() === "replace" ? "replace" : "merge"
        importTracks(list, mode)
        clearShareHash()
      } catch {
        alert("Could not parse JSON.")
      }
    }
    reader.readAsText(file)
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
                "Reset vault to the 18 seed tracks? Your votes and custom tracks will be lost.",
              )
            ) {
              resetToSeed()
              clearShareHash()
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
            ?
          </kbd>{" "}
          help
        </span>
      </div>

      {shareMsg && (
        <p className="text-xs text-vault-blue" role="status">
          {shareMsg}
        </p>
      )}
    </div>
  )
}
