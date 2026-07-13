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
}

/** Named, reorderable set of library track ids (persisted). */
export interface Playlist {
  id: string
  name: string
  trackIds: string[]
  createdAt: string
  updatedAt: string
}

export type SortKey = "score" | "title" | "artist" | "year" | "addedAt" | "genre"
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
