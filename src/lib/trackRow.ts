/**
 * Amber bar vs keyboard cursor.
 * While a song is playing, the amber row is that song. A j/k or click
 * selection on a different row is only the cursor.
 */
export function trackRowFlags(
  trackId: string,
  selectedId: string | null,
  nowPlayingId: string | null,
): { highlighted: boolean; cursor: boolean } {
  const playing = nowPlayingId === trackId
  const selected = selectedId === trackId
  if (nowPlayingId) {
    return { highlighted: playing, cursor: selected && !playing }
  }
  return { highlighted: selected, cursor: false }
}

/**
 * Row to select when the current selection is not on screen.
 * Prefer the playing song over the first visible row, so a filter change
 * does not point the cursor at a different song than the one you hear.
 */
export function fallbackSelection(
  selectedId: string | null,
  nowPlayingId: string | null,
  visibleIds: string[],
): string | null {
  if (visibleIds.length === 0) return selectedId
  if (selectedId && visibleIds.includes(selectedId)) return selectedId
  if (nowPlayingId && visibleIds.includes(nowPlayingId)) return nowPlayingId
  return visibleIds[0] ?? null
}
