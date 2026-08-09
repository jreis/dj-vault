import { useMemo, useState } from "react"
import { useVaultStore } from "../store/useVaultStore"
import type { Genre, Era } from "../types"

/**
 * Music Profile - Shows user's taste analysis
 */
export function MusicProfile() {
  const tracks = useVaultStore((s) => s.tracks)
  const [expanded, setExpanded] = useState(false)

  const profile = useMemo(() => {
    if (tracks.length === 0) return null

    // Genre breakdown
    const genreCounts = new Map<Genre, number>()
    for (const track of tracks) {
      genreCounts.set(track.genre, (genreCounts.get(track.genre) || 0) + 1)
    }
    const topGenres = Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    // Era breakdown
    const eraCounts = new Map<Era, number>()
    for (const track of tracks) {
      eraCounts.set(track.era, (eraCounts.get(track.era) || 0) + 1)
    }
    const topEras = Array.from(eraCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    // BPM analysis
    const bpms = tracks.filter((t) => t.bpm).map((t) => t.bpm!)
    const avgBPM = bpms.length > 0
      ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length)
      : null

    // Top artists
    const artistCounts = new Map<string, number>()
    for (const track of tracks) {
      artistCounts.set(track.artist, (artistCounts.get(track.artist) || 0) + 1)
    }
    const topArtists = Array.from(artistCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    // Most voted tracks
    const topTracks = [...tracks]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .filter((t) => t.score > 0)

    return {
      totalTracks: tracks.length,
      topGenres,
      topEras,
      avgBPM,
      topArtists,
      topTracks,
    }
  }, [tracks])

  if (!profile) return null

  return (
    <div className="overflow-hidden rounded-xl border border-vault-border bg-vault-surface shadow-lg">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between border-b border-vault-border px-4 py-2.5 text-left hover:bg-vault-elevated/30"
      >
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-vault-muted">
            Your Music Profile
          </h2>
          <p className="mt-0.5 text-[10px] text-vault-muted/70">
            {profile.totalTracks} tracks in your vault
          </p>
        </div>
        <span className="text-xs text-vault-amber">
          {expanded ? "▼" : "▶"}
        </span>
      </button>

      {expanded && (
        <div className="space-y-4 p-4">
          {/* Genre breakdown */}
          <div>
            <h3 className="mb-2 text-xs font-semibold text-vault-text">
              Top Genres
            </h3>
            <div className="space-y-2">
              {profile.topGenres.map(([genre, count]) => {
                const percent = Math.round((count / profile.totalTracks) * 100)
                return (
                  <div key={genre}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-vault-text">{genre}</span>
                      <span className="font-mono text-vault-muted">
                        {count} ({percent}%)
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-vault-elevated">
                      <div
                        className="h-full rounded-full bg-vault-amber"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Era breakdown */}
          <div>
            <h3 className="mb-2 text-xs font-semibold text-vault-text">
              Favorite Eras
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.topEras.map(([era, count]) => (
                <div
                  key={era}
                  className="rounded-lg border border-vault-border bg-vault-elevated px-3 py-1.5"
                >
                  <div className="text-xs font-semibold text-vault-text">
                    {era}
                  </div>
                  <div className="text-[10px] text-vault-muted">
                    {count} tracks
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* BPM info */}
          {profile.avgBPM && (
            <div>
              <h3 className="mb-2 text-xs font-semibold text-vault-text">
                Average Tempo
              </h3>
              <div className="rounded-lg border border-vault-blue/30 bg-vault-blue/5 px-3 py-2">
                <div className="text-center">
                  <div className="font-mono text-2xl font-bold text-vault-blue">
                    {profile.avgBPM}
                  </div>
                  <div className="text-[10px] text-vault-muted">BPM</div>
                </div>
              </div>
            </div>
          )}

          {/* Top artists */}
          <div>
            <h3 className="mb-2 text-xs font-semibold text-vault-text">
              Most Collected Artists
            </h3>
            <div className="space-y-1">
              {profile.topArtists.map(([artist, count]) => (
                <div
                  key={artist}
                  className="flex items-center justify-between rounded-lg bg-vault-elevated px-3 py-1.5 text-xs"
                >
                  <span className="truncate text-vault-text">{artist}</span>
                  <span className="ml-2 font-mono text-vault-amber">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top voted tracks */}
          {profile.topTracks.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold text-vault-text">
                Your Favorites (by vote)
              </h3>
              <div className="space-y-1">
                {profile.topTracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between rounded-lg bg-vault-elevated px-3 py-1.5"
                  >
                    <div className="min-w-0 flex-1 truncate text-xs text-vault-text">
                      {track.title}
                      <span className="text-vault-muted"> — {track.artist}</span>
                    </div>
                    <span className="ml-2 font-mono text-xs text-vault-green">
                      +{track.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
