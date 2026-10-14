import { useVaultStore } from "../store/useVaultStore"

/**
 * True when the phone bottom player bar renders: a track is playing, it
 * resolves, and Set Mode is off. (The bar is also `lg:hidden` via CSS.)
 */
export function useMobileBarVisible(): boolean {
  return useVaultStore(
    (s) =>
      !!s.nowPlayingId && !!s.resolveTrack(s.nowPlayingId) && !s.setMode,
  )
}
