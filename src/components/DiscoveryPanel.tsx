import { useState } from "react"
import { useVaultStore } from "../store/useVaultStore"
import { useToastStore } from "../store/useToastStore"
import { getDiscoverySuggestions } from "../lib/artistRelations"
import { getSuggestedArtists } from "../lib/similarTracks"

export function DiscoveryPanel() {
  const tracks = useVaultStore((s) => s.tracks)
  const nowPlayingId = useVaultStore((s) => s.nowPlayingId)
  const showToast = useToastStore((s) => s.show)
  const [expanded, setExpanded] = useState(false)

  const currentTrack = nowPlayingId
    ? tracks.find((t) => t.id === nowPlayingId)
    : null

  // Get all unique artists in library
  const libraryArtists = Array.from(
    new Set(tracks.map((t) => t.artist))
  ).sort()

  // Get suggested artists to discover
  const suggestions = getDiscoverySuggestions(libraryArtists)

  // Get suggestions for current track
  const currentSuggestions = currentTrack
    ? getSuggestedArtists(currentTrack, tracks)
    : []

  function copySearchQuery(artist: string) {
    const query = `${artist} youtube music`
    navigator.clipboard
      .writeText(query)
      .then(() => {
        showToast(`Copied "${artist}" search`, "success")
      })
      .catch(() => {
        showToast(`Search for: ${artist}`, "info")
      })
  }

  function openYouTubeSearch(artist: string) {
    useVaultStore.getState().requestYoutubeSearch(artist)
    queueMicrotask(() => {
      document
        .getElementById("vault-search")
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    })
  }

  if (suggestions.length === 0 && currentSuggestions.length === 0) {
    return null
  }

  return (
    <div className="overflow-hidden rounded-xl border border-vault-border bg-vault-surface shadow-lg">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between border-b border-vault-border px-4 py-2.5 text-left hover:bg-vault-elevated/30"
      >
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-vault-muted">
            Discover New Artists
          </h2>
          <p className="mt-0.5 text-[10px] text-vault-muted/70">
            Based on your library
          </p>
        </div>
        <span className="text-xs text-vault-amber">
          {expanded ? "▼" : "▶"}
        </span>
      </button>

      {expanded && (
        <div className="space-y-4 p-4">
          {currentTrack && currentSuggestions.length > 0 && (
            <div className="rounded-lg border border-vault-blue/30 bg-vault-blue/5 p-3">
              <h3 className="mb-2 text-xs font-semibold text-vault-blue">
                If you like {currentTrack.artist}, try:
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {currentSuggestions.map((artist) => (
                  <button
                    key={artist}
                    type="button"
                    onClick={() => openYouTubeSearch(artist)}
                    className="group flex items-center gap-1.5 rounded-md border border-vault-blue/30 bg-vault-surface px-2.5 py-1.5 text-xs text-vault-text transition hover:border-vault-blue hover:bg-vault-blue/10"
                  >
                    <span>{artist}</span>
                    <span className="text-[10px] text-vault-blue opacity-0 transition group-hover:opacity-100">
                      ↗
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {suggestions.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold text-vault-text">
                Recommended Artists to Explore
              </h3>
              <p className="mb-3 text-[10px] text-vault-muted/70">
                Click to search YouTube in the vault, then add tracks you like
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                {suggestions.slice(0, 12).map((artist) => (
                  <button
                    key={artist}
                    type="button"
                    onClick={() => openYouTubeSearch(artist)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      copySearchQuery(artist)
                    }}
                    className="group rounded-lg border border-vault-border bg-vault-elevated px-3 py-2 text-left text-xs text-vault-text transition hover:border-vault-amber hover:bg-vault-amber/5"
                    title="Left-click to search in the vault • Right-click to copy search"
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate font-medium">{artist}</span>
                      <span className="ml-1 text-[10px] text-vault-amber opacity-0 transition group-hover:opacity-100">
                        ↗
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              {suggestions.length > 12 && (
                <p className="mt-2 text-center text-[10px] text-vault-muted/70">
                  +{suggestions.length - 12} more based on your tastes
                </p>
              )}
            </div>
          )}

          <div className="rounded-lg border border-vault-border/50 bg-vault-elevated/30 p-3">
            <p className="text-[11px] text-vault-muted">
              <span className="font-semibold text-vault-amber">Tip:</span> When
              you find a song you like on YouTube, click{" "}
              <span className="text-vault-text">+ Add track</span> and paste the
              YouTube URL to add it to your vault!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
