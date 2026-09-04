import type { Era, Genre } from "../types"
import { guessTitleArtist } from "./youtubeDiscover"

export function eraFromYear(year: number): Era {
  if (year < 1960) return "50s"
  if (year < 1970) return "60s"
  if (year < 1980) return "70s"
  if (year < 1990) return "80s"
  if (year < 2000) return "90s"
  if (year < 2010) return "00s"
  if (year < 2020) return "10s"
  return "20s"
}

const GENRE_HINTS: Array<{ genre: Genre; keys: string[] }> = [
  {
    genre: "Jazz",
    keys: [
      "jazz",
      "bebop",
      "hard bop",
      "coltrane",
      "miles davis",
      "thelonious",
      "mingus",
      "charlie parker",
      "dizzy gillespie",
      "sonny rollins",
      "bill evans",
      "cannonball",
      "wayne shorter",
      "herbie hancock",
      "keith jarrett",
      "ella fitzgerald",
      "billie holiday",
      "duke ellington",
      "count basie",
      "john coltrane",
    ],
  },
  {
    genre: "Metal",
    keys: [
      "metal",
      "thrash",
      "metallica",
      "slayer",
      "megadeth",
      "anthrax",
      "iron maiden",
      "black sabbath",
      "ghost",
    ],
  },
  {
    genre: "Nu Metal",
    keys: [
      "nu metal",
      "korn",
      "limp bizkit",
      "deftones",
      "system of a down",
    ],
  },
  {
    genre: "Grunge",
    keys: [
      "grunge",
      "nirvana",
      "pearl jam",
      "soundgarden",
      "alice in chains",
    ],
  },
  {
    genre: "Punk",
    keys: ["punk", "ramones", "sex pistols", "green day", "offspring"],
  },
  {
    genre: "Hard Rock",
    keys: [
      "hard rock",
      "ac/dc",
      "guns n' roses",
      "guns n roses",
      "aerosmith",
      "tesla",
      "def leppard",
    ],
  },
  {
    genre: "Classic Rock",
    keys: [
      "classic rock",
      "elvis",
      "beatles",
      "led zeppelin",
      "pink floyd",
      "queen",
      "rolling stones",
    ],
  },
  {
    genre: "Alternative",
    keys: [
      "alternative",
      "radiohead",
      "foo fighters",
      "tool",
      "smashing pumpkins",
      "rage against",
    ],
  },
]

const GENRE_DEFAULT_YEAR: Partial<Record<Genre, number>> = {
  Jazz: 1961,
  "Classic Rock": 1975,
  Metal: 1991,
  Grunge: 1992,
  Punk: 1977,
  "Hard Rock": 1987,
  "Nu Metal": 2001,
  Alternative: 1997,
}

export function guessGenre(text: string): Genre {
  const hay = text.toLowerCase()
  for (const { genre, keys } of GENRE_HINTS) {
    if (keys.some((k) => hay.includes(k))) return genre
  }
  return "Other"
}

export function guessYear(text: string, fallback = 1975): number {
  const now = new Date().getFullYear()
  const years = [...text.matchAll(/\b(19[5-9]\d|20[0-2]\d)\b/g)].map((m) =>
    Number(m[1]),
  )
  const valid = years.filter((y) => y >= 1950 && y <= now + 1)
  return valid[0] ?? fallback
}

export function guessTrackMeta(input: {
  query: string
  videoTitle: string
  channelTitle: string
}): {
  title: string
  artist: string
  genre: Genre
  year: number
  era: Era
} {
  const { title, artist } = guessTitleArtist(
    input.videoTitle,
    input.channelTitle,
  )
  const blob = `${input.query} ${input.videoTitle} ${input.channelTitle} ${title} ${artist}`
  const genre = guessGenre(blob)
  const year = guessYear(blob, GENRE_DEFAULT_YEAR[genre] ?? 1995)
  return { title, artist, genre, year, era: eraFromYear(year) }
}

export function youtubeWebSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}
