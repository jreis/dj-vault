import type { Era, Genre, Track } from "../types"

export interface SimilarMatch {
  track: Track
  /** 0–100 similarity score */
  score: number
  /** Short human-readable why labels */
  reasons: string[]
}

/** Neighbor genres for soft matches (shared scene / energy). */
const GENRE_NEIGHBORS: Record<Genre, Genre[]> = {
  Metal: ["Nu Metal", "Hard Rock", "Classic Rock"],
  "Nu Metal": ["Metal", "Alternative", "Hard Rock"],
  Grunge: ["Alternative", "Punk", "Hard Rock"],
  Punk: ["Grunge", "Alternative", "Hard Rock"],
  Alternative: ["Grunge", "Punk", "Nu Metal", "Hard Rock"],
  "Hard Rock": ["Metal", "Classic Rock", "Grunge", "Nu Metal"],
  "Classic Rock": ["Hard Rock", "Metal"],
  Other: [],
}

const ERA_ORDER: Era[] = ["70s", "80s", "90s", "00s", "10s", "20s"]

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "to",
  "for",
  "in",
  "on",
  "at",
  "set",
  "dj",
  "/",
  "—",
  "-",
])

function eraIndex(era: Era): number {
  return ERA_ORDER.indexOf(era)
}

function tokenizeNotes(notes: string): Set<string> {
  return new Set(
    notes
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  )
}

function scorePair(seed: Track, candidate: Track): SimilarMatch | null {
  if (seed.id === candidate.id) return null
  // Exact same YouTube upload is not "similar" — it's a dupe
  if (seed.youtubeId === candidate.youtubeId) return null

  let score = 0
  const reasons: string[] = []

  // Genre (strong signal)
  if (seed.genre === candidate.genre) {
    score += 40
    reasons.push(`same genre (${seed.genre})`)
  } else if (GENRE_NEIGHBORS[seed.genre]?.includes(candidate.genre)) {
    score += 22
    reasons.push(`related genre (${candidate.genre})`)
  }

  // Era
  if (seed.era === candidate.era) {
    score += 20
    reasons.push(`same era (${seed.era})`)
  } else {
    const dist = Math.abs(eraIndex(seed.era) - eraIndex(candidate.era))
    if (dist === 1) {
      score += 10
      reasons.push(`adjacent era (${candidate.era})`)
    }
  }

  // Year proximity
  const yearDelta = Math.abs(seed.year - candidate.year)
  if (yearDelta === 0) {
    score += 15
    reasons.push(`same year (${seed.year})`)
  } else if (yearDelta <= 2) {
    score += 12
    reasons.push(`±${yearDelta} year`)
  } else if (yearDelta <= 5) {
    score += 7
    reasons.push(`within ${yearDelta} years`)
  } else if (yearDelta <= 10) {
    score += 3
  }

  // Same artist
  if (seed.artist.toLowerCase() === candidate.artist.toLowerCase()) {
    score += 18
    reasons.push("same artist")
  }

  // DJ notes keyword overlap (energy, placement, mood)
  const seedTokens = tokenizeNotes(seed.notes)
  const candTokens = tokenizeNotes(candidate.notes)
  if (seedTokens.size > 0 && candTokens.size > 0) {
    let overlap = 0
    for (const t of seedTokens) {
      if (candTokens.has(t)) overlap++
    }
    if (overlap > 0) {
      const notePts = Math.min(15, overlap * 5)
      score += notePts
      reasons.push(`notes overlap (${overlap})`)
    }
  }

  // Slight boost for highly voted tracks (good set material)
  if (candidate.score >= 10) {
    score += 4
    reasons.push("high vault score")
  } else if (candidate.score >= 5) {
    score += 2
  }

  // Title word soft match (rare but useful for covers / live variants)
  const seedTitleWords = new Set(
    seed.title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !STOP.has(w)),
  )
  const candTitleWords = candidate.title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !STOP.has(w))
  const titleHits = candTitleWords.filter((w) => seedTitleWords.has(w)).length
  if (titleHits > 0) {
    score += Math.min(8, titleHits * 4)
    reasons.push("title keywords")
  }

  // Floor: require a meaningful signal
  if (score < 18) return null

  return {
    track: candidate,
    score: Math.min(100, Math.round(score)),
    reasons: reasons.slice(0, 3),
  }
}

/**
 * Rank vault tracks similar to `seed`.
 * Pure / offline — no external API.
 */
export function findSimilarTracks(
  seed: Track,
  library: Track[],
  limit = 8,
): SimilarMatch[] {
  const matches: SimilarMatch[] = []
  for (const t of library) {
    const m = scorePair(seed, t)
    if (m) matches.push(m)
  }
  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.track.score - a.track.score
  })
  return matches.slice(0, limit)
}

/** YouTube search for discovery outside the vault. */
export function youtubeSimilarSearchUrl(track: Track): string {
  const q = `${track.artist} ${track.title} similar songs`
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
}

/** YouTube search for more from the same artist. */
export function youtubeArtistSearchUrl(track: Track): string {
  const q = `${track.artist} music`
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
}
