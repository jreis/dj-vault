import type { Filters, Genre, Track } from "../types"

export function matchesQuery(track: Track, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    track.title.toLowerCase().includes(q) ||
    track.artist.toLowerCase().includes(q) ||
    track.notes.toLowerCase().includes(q) ||
    track.genre.toLowerCase().includes(q) ||
    track.era.toLowerCase().includes(q) ||
    String(track.year).includes(q)
  )
}

export function filterAndSortTracks(tracks: Track[], filters: Filters): Track[] {
  let result = tracks.filter((t) => {
    if (filters.genre !== "All" && t.genre !== filters.genre) return false
    if (filters.era !== "All" && t.era !== filters.era) return false
    return matchesQuery(t, filters.query)
  })

  const dir = filters.sortDir === "asc" ? 1 : -1
  const key = filters.sortKey

  result = [...result].sort((a, b) => {
    let cmp = 0
    switch (key) {
      case "score":
        cmp = a.score - b.score
        break
      case "year":
        cmp = a.year - b.year
        break
      case "title":
        cmp = a.title.localeCompare(b.title)
        break
      case "artist":
        cmp = a.artist.localeCompare(b.artist)
        break
      case "genre":
        cmp = a.genre.localeCompare(b.genre)
        break
      case "addedAt":
        cmp = a.addedAt.localeCompare(b.addedAt)
        break
    }
    if (cmp === 0) cmp = a.title.localeCompare(b.title)
    return cmp * dir
  })

  return result
}

/** Genre counts for the current search + era (genre chip bar). */
export function genreCounts(
  tracks: Track[],
  filters: Pick<Filters, "query" | "era">,
): Map<Genre | "All", number> {
  const scoped = tracks.filter((t) => {
    if (filters.era !== "All" && t.era !== filters.era) return false
    return matchesQuery(t, filters.query)
  })
  const counts = new Map<Genre | "All", number>()
  counts.set("All", scoped.length)
  for (const t of scoped) {
    counts.set(t.genre, (counts.get(t.genre) ?? 0) + 1)
  }
  return counts
}

export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.genre !== "All" ||
    filters.era !== "All"
  )
}
