import { useState, type MouseEvent } from "react"
import type { Track } from "../types"
import { createTrackShareLink, publishShareUrl } from "../lib/shareApi"
import {
  selectPlaybackTracks,
  useVaultStore,
} from "../store/useVaultStore"
import { useToastStore } from "../store/useToastStore"

export function ShareTrackButton({
  track,
  compact = false,
  className = "",
}: {
  track: Track
  compact?: boolean
  className?: string
}) {
  const [busy, setBusy] = useState(false)
  const showToast = useToastStore((s) => s.show)

  async function onShare(e: MouseEvent) {
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    try {
      const library = selectPlaybackTracks(useVaultStore.getState())
      const result = await createTrackShareLink(track, library)
      if (!result.ok) {
        showToast(result.error, "error")
        return
      }
      const offered = await publishShareUrl({
        url: result.url,
        title: result.name,
        text: `${result.count}-track set around “${track.title}” by ${track.artist}`,
      })
      if (offered === "cancelled") return
      showToast(
        offered === "shared"
          ? `Shared “${result.name}” · ${result.count} tracks`
          : `Copied set link · ${result.count} track${result.count === 1 ? "" : "s"} around “${track.title}”`,
        "success",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={(e) => void onShare(e)}
      className={className}
      title="Share a set: this track plus similar ones"
    >
      {busy ? "Sharing…" : compact ? "Share" : "Share set"}
    </button>
  )
}
