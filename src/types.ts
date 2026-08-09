export type Genre =
  | "Metal"
  | "Grunge"
  | "Punk"
  | "Alternative"
  | "Hard Rock"
  | "Nu Metal"
  | "Classic Rock"
  | "Other"

export type Era = "70s" | "80s" | "90s" | "00s" | "10s" | "20s"

export interface Track {
  id: string
  title: string
  artist: string
  youtubeId: string
  genre: Genre
  era: Era
  year: number
  score: number
  notes: string
  addedAt: string
  /** Estimated BPM (beats per minute) - calculated on load */
  bpm?: number
}

/** Named, reorderable set of library track ids (persisted to localStorage). */
export interface Playlist {
  id: string
  name: string
  /** Optional description/dedication (e.g., "In memory of...") */
  description?: string
  trackIds: string[]
  createdAt: string
  updatedAt: string
  /** Curated playlists by Jason (featured/pinned) */
  curated?: boolean
}

export type SortKey = "score" | "title" | "artist" | "year" | "addedAt" | "genre" | "bpm"
export type SortDir = "asc" | "desc"

export interface Filters {
  query: string
  genre: Genre | "All"
  era: Era | "All"
  sortKey: SortKey
  sortDir: SortDir
}

export const GENRES: Genre[] = [
  "Metal",
  "Grunge",
  "Punk",
  "Alternative",
  "Hard Rock",
  "Nu Metal",
  "Classic Rock",
  "Other",
]

export const ERAS: Era[] = ["70s", "80s", "90s", "00s", "10s", "20s"]
