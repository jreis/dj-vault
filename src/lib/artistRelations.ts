/**
 * Artist relationship database for music discovery
 * Maps artists to similar artists, subgenres, and vibes
 */

export interface ArtistInfo {
  name: string
  /** Primary subgenre(s) */
  subgenres: string[]
  /** Era they were most active */
  peakEra: string[]
  /** Vibe/mood descriptors */
  vibes: string[]
  /** Similar/related artists */
  similarArtists: string[]
}

/**
 * Curated artist relationship database
 * Focused on rock, metal, grunge, punk from 70s-20s
 */
export const ARTIST_DATABASE: Record<string, ArtistInfo> = {
  // Hard Rock / Hair Metal
  "Tesla": {
    name: "Tesla",
    subgenres: ["Hair Metal", "Hard Rock", "Melodic Rock"],
    peakEra: ["80s", "90s"],
    vibes: ["anthemic", "melodic", "guitar-driven", "uplifting"],
    similarArtists: [
      "Def Leppard",
      "Whitesnake",
      "Warrant",
      "Cinderella",
      "Great White",
      "FireHouse",
      "Winger",
      "Skid Row",
      "Bon Jovi",
      "Poison",
    ],
  },
  "Def Leppard": {
    name: "Def Leppard",
    subgenres: ["Hair Metal", "Hard Rock", "Arena Rock"],
    peakEra: ["80s", "90s"],
    vibes: ["anthemic", "polished", "radio-friendly", "energetic"],
    similarArtists: ["Tesla", "Whitesnake", "Bon Jovi", "Scorpions", "Europe"],
  },
  "AC/DC": {
    name: "AC/DC",
    subgenres: ["Hard Rock", "Classic Rock"],
    peakEra: ["70s", "80s"],
    vibes: ["raw", "electric", "blues-based", "energetic"],
    similarArtists: [
      "Guns N' Roses",
      "Motorhead",
      "Rose Tattoo",
      "Airbourne",
      "The Angels",
    ],
  },

  // Grunge
  "Nirvana": {
    name: "Nirvana",
    subgenres: ["Grunge", "Alternative Rock"],
    peakEra: ["90s"],
    vibes: ["raw", "angst-driven", "melodic", "explosive"],
    similarArtists: [
      "Pearl Jam",
      "Soundgarden",
      "Alice in Chains",
      "Stone Temple Pilots",
      "Mudhoney",
      "Melvins",
      "Foo Fighters",
    ],
  },
  "Pearl Jam": {
    name: "Pearl Jam",
    subgenres: ["Grunge", "Alternative Rock"],
    peakEra: ["90s", "00s"],
    vibes: ["passionate", "classic-rock-influenced", "earnest", "powerful"],
    similarArtists: [
      "Soundgarden",
      "Alice in Chains",
      "Stone Temple Pilots",
      "Temple of the Dog",
      "Mother Love Bone",
    ],
  },
  "Soundgarden": {
    name: "Soundgarden",
    subgenres: ["Grunge", "Heavy Alternative"],
    peakEra: ["90s"],
    vibes: ["heavy", "psychedelic", "dark", "powerful"],
    similarArtists: [
      "Alice in Chains",
      "Pearl Jam",
      "Nirvana",
      "Audioslave",
      "Screaming Trees",
    ],
  },
  "Alice in Chains": {
    name: "Alice in Chains",
    subgenres: ["Grunge", "Heavy Alternative", "Sludge Metal"],
    peakEra: ["90s"],
    vibes: ["dark", "heavy", "haunting", "sludgy"],
    similarArtists: [
      "Soundgarden",
      "Mad Season",
      "Jerry Cantrell",
      "Down",
      "Kyuss",
    ],
  },

  // Metal
  "Metallica": {
    name: "Metallica",
    subgenres: ["Thrash Metal", "Heavy Metal"],
    peakEra: ["80s", "90s"],
    vibes: ["aggressive", "technical", "epic", "powerful"],
    similarArtists: [
      "Megadeth",
      "Slayer",
      "Anthrax",
      "Testament",
      "Exodus",
      "Pantera",
    ],
  },
  "Black Sabbath": {
    name: "Black Sabbath",
    subgenres: ["Heavy Metal", "Doom Metal"],
    peakEra: ["70s", "80s"],
    vibes: ["doom-laden", "heavy", "occult", "foundational"],
    similarArtists: ["Judas Priest", "Iron Maiden", "Deep Purple", "Led Zeppelin"],
  },
  "Tool": {
    name: "Tool",
    subgenres: ["Progressive Metal", "Art Metal"],
    peakEra: ["90s", "00s", "10s"],
    vibes: ["complex", "atmospheric", "introspective", "polyrhythmic"],
    similarArtists: [
      "A Perfect Circle",
      "Puscifer",
      "Deftones",
      "Chevelle",
      "Soen",
    ],
  },

  // Alternative / Nu Metal
  "Rage Against the Machine": {
    name: "Rage Against the Machine",
    subgenres: ["Rap Metal", "Alternative Metal"],
    peakEra: ["90s"],
    vibes: ["political", "aggressive", "funky", "revolutionary"],
    similarArtists: [
      "Audioslave",
      "System of a Down",
      "Prophets of Rage",
      "Cypress Hill",
    ],
  },
  "System of a Down": {
    name: "System of a Down",
    subgenres: ["Alternative Metal", "Nu Metal"],
    peakEra: ["00s"],
    vibes: ["chaotic", "political", "eccentric", "heavy"],
    similarArtists: [
      "Deftones",
      "Slipknot",
      "Korn",
      "Mudvayne",
      "Disturbed",
    ],
  },
  "Linkin Park": {
    name: "Linkin Park",
    subgenres: ["Nu Metal", "Alternative Rock"],
    peakEra: ["00s"],
    vibes: ["emotional", "electronic-tinged", "anthemic", "introspective"],
    similarArtists: [
      "Papa Roach",
      "Disturbed",
      "Breaking Benjamin",
      "Three Days Grace",
      "Bring Me the Horizon",
    ],
  },

  // Punk
  "Green Day": {
    name: "Green Day",
    subgenres: ["Punk Rock", "Pop Punk"],
    peakEra: ["90s", "00s"],
    vibes: ["rebellious", "melodic", "energetic", "political"],
    similarArtists: [
      "The Offspring",
      "Blink-182",
      "Sum 41",
      "Bad Religion",
      "NOFX",
    ],
  },
  "The Offspring": {
    name: "The Offspring",
    subgenres: ["Punk Rock", "Skate Punk"],
    peakEra: ["90s", "00s"],
    vibes: ["fast", "catchy", "sarcastic", "energetic"],
    similarArtists: [
      "Green Day",
      "Rancid",
      "Pennywise",
      "Bad Religion",
      "Millencolin",
    ],
  },

  // Alternative Rock
  "Foo Fighters": {
    name: "Foo Fighters",
    subgenres: ["Alternative Rock", "Post-Grunge"],
    peakEra: ["90s", "00s", "10s"],
    vibes: ["anthemic", "powerful", "melodic", "arena-ready"],
    similarArtists: [
      "Queens of the Stone Age",
      "Them Crooked Vultures",
      "Weezer",
      "Bush",
      "Chevelle",
    ],
  },

  // Modern Metal
  "Ghost": {
    name: "Ghost",
    subgenres: ["Occult Rock", "Heavy Metal", "Progressive Rock"],
    peakEra: ["10s", "20s"],
    vibes: ["theatrical", "melodic", "occult", "retro"],
    similarArtists: [
      "Blue Öyster Cult",
      "Mercyful Fate",
      "Candlemass",
      "Volbeat",
      "Avatar",
    ],
  },

  // Classic Rock
  "Elvis Presley": {
    name: "Elvis Presley",
    subgenres: ["Rock and Roll", "Rockabilly", "Classic Rock"],
    peakEra: ["70s"],
    vibes: ["iconic", "soulful", "energetic", "timeless"],
    similarArtists: [
      "Roy Orbison",
      "The Beatles",
      "Jerry Lee Lewis",
      "Chuck Berry",
      "Little Richard",
    ],
  },

  // Jazz
  "John Coltrane": {
    name: "John Coltrane",
    subgenres: ["Jazz", "Hard Bop", "Modal Jazz"],
    peakEra: ["50s", "60s"],
    vibes: ["spiritual", "searching", "intense", "lyrical"],
    similarArtists: [
      "Miles Davis",
      "Thelonious Monk",
      "Sonny Rollins",
      "Wayne Shorter",
      "McCoy Tyner",
      "Cannonball Adderley",
      "Bill Evans",
    ],
  },
  "Miles Davis": {
    name: "Miles Davis",
    subgenres: ["Jazz", "Cool Jazz", "Modal Jazz"],
    peakEra: ["50s", "60s"],
    vibes: ["cool", "innovative", "spacious", "electric"],
    similarArtists: [
      "John Coltrane",
      "Thelonious Monk",
      "Bill Evans",
      "Wayne Shorter",
      "Herbie Hancock",
      "Cannonball Adderley",
    ],
  },
  "Thelonious Monk": {
    name: "Thelonious Monk",
    subgenres: ["Jazz", "Bebop"],
    peakEra: ["50s", "60s"],
    vibes: ["angular", "playful", "percussive", "off-kilter"],
    similarArtists: [
      "John Coltrane",
      "Miles Davis",
      "Charlie Parker",
      "Bud Powell",
      "Duke Ellington",
    ],
  },
}

/**
 * Find similar artists based on the relationship database
 */
export function getSimilarArtists(artistName: string): string[] {
  const normalized = artistName.toLowerCase().trim()

  // Direct lookup
  for (const [key, info] of Object.entries(ARTIST_DATABASE)) {
    if (key.toLowerCase() === normalized) {
      return info.similarArtists
    }
  }

  // Partial match
  for (const [key, info] of Object.entries(ARTIST_DATABASE)) {
    if (
      key.toLowerCase().includes(normalized) ||
      normalized.includes(key.toLowerCase())
    ) {
      return info.similarArtists
    }
  }

  return []
}

/**
 * Get artist info for recommendations
 */
export function getArtistInfo(artistName: string): ArtistInfo | null {
  const normalized = artistName.toLowerCase().trim()

  for (const [key, info] of Object.entries(ARTIST_DATABASE)) {
    if (key.toLowerCase() === normalized) {
      return info
    }
  }

  // Partial match
  for (const [key, info] of Object.entries(ARTIST_DATABASE)) {
    if (
      key.toLowerCase().includes(normalized) ||
      normalized.includes(key.toLowerCase())
    ) {
      return info
    }
  }

  return null
}

/**
 * Calculate similarity score between two artists (0-100)
 */
export function getArtistSimilarity(artist1: string, artist2: string): number {
  const info1 = getArtistInfo(artist1)
  const info2 = getArtistInfo(artist2)

  if (!info1 || !info2) return 0

  let score = 0

  // Direct similar artist relationship = 80 points
  if (info1.similarArtists.includes(info2.name)) score += 80
  if (info2.similarArtists.includes(info1.name)) score += 80

  // Shared subgenres = 40 points
  const sharedSubgenres = info1.subgenres.filter((s) =>
    info2.subgenres.includes(s),
  ).length
  score += sharedSubgenres * 40

  // Shared era = 20 points
  const sharedEras = info1.peakEra.filter((e) => info2.peakEra.includes(e)).length
  score += sharedEras * 20

  // Shared vibes = 10 points each
  const sharedVibes = info1.vibes.filter((v) => info2.vibes.includes(v)).length
  score += sharedVibes * 10

  return Math.min(100, score)
}

/**
 * Get discovery suggestions based on what the user already has
 */
export function getDiscoverySuggestions(existingArtists: string[]): string[] {
  const suggestions = new Set<string>()

  for (const artist of existingArtists) {
    const similar = getSimilarArtists(artist)
    for (const s of similar) {
      // Don't suggest artists they already have
      if (!existingArtists.some((a) => a.toLowerCase() === s.toLowerCase())) {
        suggestions.add(s)
      }
    }
  }

  return Array.from(suggestions)
}
