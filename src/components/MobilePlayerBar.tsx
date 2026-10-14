import { useVaultStore } from "../store/useVaultStore"
import { useMobileBarVisible } from "../hooks/useMobileBarVisible"

/**
 * Sticky bottom transport for phones (hidden at lg+, where the player column
 * is sticky). Every control is a direct tap, so iOS Safari treats playback as
 * user-initiated; the bar pads itself for the home indicator.
 */
export function MobilePlayerBar() {
  const visible = useMobileBarVisible()
  const isPlaying = useVaultStore((s) => s.isPlaying)
  const togglePlayback = useVaultStore((s) => s.togglePlayback)
  const playNext = useVaultStore((s) => s.playNext)
  const playPrev = useVaultStore((s) => s.playPrev)
  const track = useVaultStore((s) =>
    s.nowPlayingId ? s.resolveTrack(s.nowPlayingId) : undefined,
  )

  if (!visible || !track) return null

  const jumpToPlayer = () =>
    document
      .querySelector('[aria-label="Player and queue"]')
      ?.scrollIntoView({ behavior: "smooth", block: "start" })

  const btn =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-vault-text active:bg-vault-elevated"

  return (
    <div
      role="region"
      aria-label="Now playing controls"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-vault-border bg-vault-surface/95 pb-[env(safe-area-inset-bottom)] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] backdrop-blur-md lg:hidden"
    >
      <div className="flex items-center gap-1 py-1.5">
        <button
          type="button"
          onClick={jumpToPlayer}
          className="flex min-w-0 flex-1 flex-col items-start justify-center px-2 text-left"
          aria-label={`Show player: ${track.title} by ${track.artist}`}
        >
          <span className="w-full truncate text-sm font-semibold">
            {track.title}
          </span>
          <span className="w-full truncate text-xs text-vault-muted">
            {track.artist}
          </span>
        </button>
        <button type="button" onClick={playPrev} className={btn} aria-label="Previous track">
          ⏮
        </button>
        <button
          type="button"
          onClick={togglePlayback}
          className={`${btn} bg-vault-amber text-stone-950 active:bg-vault-amber-dim`}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button type="button" onClick={playNext} className={btn} aria-label="Next track">
          ⏭
        </button>
      </div>
    </div>
  )
}
