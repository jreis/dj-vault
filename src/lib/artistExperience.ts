import { ARTIST_DATABASE, type ArtistInfo } from "./artistRelations.ts"

export interface ArtistTheme {
  id: string
  bg: string
  surface: string
  elevated: string
  border: string
  muted: string
  text: string
  accent: string
  accentDim: string
}

export interface ArtistExperience {
  name: string
  tagline: string
  subgenres: string[]
  vibes: string[]
  peakEra: string[]
  influences: string[]
  kin: string[]
  theme: ArtistTheme | null
}

const THEME_VARS = [
  "--color-vault-bg",
  "--color-vault-surface",
  "--color-vault-elevated",
  "--color-vault-border",
  "--color-vault-muted",
  "--color-vault-text",
  "--color-vault-amber",
  "--color-vault-amber-dim",
] as const

/** Hand-built palettes. Unknown artists get no costume. */
const ARTIST_THEMES: Record<string, ArtistTheme> = {
  Ghost: {
    id: "ghost",
    bg: "#06110c",
    surface: "#0c1c14",
    elevated: "#163325",
    border: "#3d5c48",
    muted: "#8aa894",
    text: "#eef6f0",
    accent: "#d4af37",
    accentDim: "#8a7018",
  },
  Metallica: {
    id: "metallica",
    bg: "#0a0c10",
    surface: "#141820",
    elevated: "#1c2430",
    border: "#3d4d5c",
    muted: "#8b9aab",
    text: "#e8eef4",
    accent: "#7eb8d4",
    accentDim: "#4a7a94",
  },
  Nirvana: {
    id: "nirvana",
    bg: "#12100c",
    surface: "#1c1914",
    elevated: "#2a241c",
    border: "#5c5344",
    muted: "#a39a86",
    text: "#f4efe4",
    accent: "#c4a035",
    accentDim: "#8a7020",
  },
  "Black Sabbath": {
    id: "black-sabbath",
    bg: "#0c0810",
    surface: "#16121c",
    elevated: "#241c2c",
    border: "#4a3d5c",
    muted: "#9a8bab",
    text: "#f0e8f4",
    accent: "#a78bfa",
    accentDim: "#6d4aad",
  },
  Tool: {
    id: "tool",
    bg: "#0a0c0d",
    surface: "#14181a",
    elevated: "#1c2428",
    border: "#3d4d52",
    muted: "#8b9aa0",
    text: "#e8eef0",
    accent: "#5eead4",
    accentDim: "#2d8a7c",
  },
  "Elvis Presley": {
    id: "elvis",
    bg: "#140c10",
    surface: "#1c1218",
    elevated: "#2c1c24",
    border: "#5c3d4a",
    muted: "#ab8b96",
    text: "#f4e8ee",
    accent: "#f472b6",
    accentDim: "#ad4a7a",
  },
  "John Coltrane": {
    id: "coltrane",
    bg: "#080a14",
    surface: "#101428",
    elevated: "#181c38",
    border: "#3d4570",
    muted: "#8b93b8",
    text: "#e8eaf4",
    accent: "#818cf8",
    accentDim: "#4a52ad",
  },
  "Blue Öyster Cult": {
    id: "boc",
    bg: "#080c14",
    surface: "#101828",
    elevated: "#182438",
    border: "#3d5570",
    muted: "#8ba0b8",
    text: "#e8eef4",
    accent: "#5b9bd5",
    accentDim: "#3a6a94",
  },
  ABBA: {
    id: "abba",
    bg: "#0c1018",
    surface: "#141c2c",
    elevated: "#1c2840",
    border: "#4a6080",
    muted: "#93a8c4",
    text: "#eef2f8",
    accent: "#f4d35e",
    accentDim: "#b89620",
  },
}

/**
 * Strict match for "this search is a band destination".
 * Exact name, unique 4+ letter prefix, or unique first token ("alice").
 * Looser substring matching stays in getArtistInfo for similarity only.
 */
export function matchKnownArtist(query: string): ArtistInfo | null {
  const q = query.trim().toLowerCase()
  if (!q) return null

  const entries = Object.entries(ARTIST_DATABASE)

  const exact = entries.find(([key]) => key.toLowerCase() === q)
  if (exact) return exact[1]

  if (q.length >= 4) {
    const prefix = entries.filter(([key]) => key.toLowerCase().startsWith(q))
    if (prefix.length === 1) return prefix[0][1]
  }

  if (q.length >= 4 && !/\s/.test(q)) {
    const first = entries.filter(
      ([key]) => key.toLowerCase().split(/\s+/)[0] === q,
    )
    if (first.length === 1) return first[0][1]
  }

  return null
}

function taglineFor(info: ArtistInfo): string {
  if (info.tagline) return info.tagline
  const era = info.peakEra.join("–")
  const genre = info.subgenres[0] ?? "Rock"
  return era ? `${genre} · ${era}` : genre
}

function lineage(info: ArtistInfo): { influences: string[]; kin: string[] } {
  const influences = info.influences ?? []
  const kin =
    info.kin ??
    info.similarArtists.filter((name) => !influences.includes(name))
  return { influences, kin }
}

/** Search box → artist world, or null if this isn't a known band destination. */
export function resolveArtistExperience(
  query: string,
): ArtistExperience | null {
  const info = matchKnownArtist(query)
  if (!info) return null
  const { influences, kin } = lineage(info)
  return {
    name: info.name,
    tagline: taglineFor(info),
    subgenres: info.subgenres,
    vibes: info.vibes,
    peakEra: info.peakEra,
    influences,
    kin,
    theme: ARTIST_THEMES[info.name] ?? null,
  }
}

export function artistThemeStyle(theme: ArtistTheme): Record<string, string> {
  return {
    "--color-vault-bg": theme.bg,
    "--color-vault-surface": theme.surface,
    "--color-vault-elevated": theme.elevated,
    "--color-vault-border": theme.border,
    "--color-vault-muted": theme.muted,
    "--color-vault-text": theme.text,
    "--color-vault-amber": theme.accent,
    "--color-vault-amber-dim": theme.accentDim,
  }
}

/** Paint or clear the vault chrome. Inline vars beat both dark and light sheets. */
export function applyArtistTheme(
  theme: ArtistTheme | null,
  root: HTMLElement,
): void {
  if (!theme) {
    root.removeAttribute("data-artist-theme")
    for (const prop of THEME_VARS) root.style.removeProperty(prop)
    return
  }
  root.setAttribute("data-artist-theme", theme.id)
  const style = artistThemeStyle(theme)
  for (const [prop, value] of Object.entries(style)) {
    root.style.setProperty(prop, value)
  }
}
