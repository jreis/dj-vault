export {
  parseSeedTrackPayload,
  tracksToSeedRecords,
} from "../functions/_lib/seedCatalog.ts"
import type { Playlist, Track } from "../src/types.ts"

export function renderSeedTracksArray(tracks: Track[]): string {
  const objects = tracks.map((t) => {
    const lines = [
      `    id: ${JSON.stringify(t.id)},`,
      `    title: ${JSON.stringify(t.title)},`,
      `    artist: ${JSON.stringify(t.artist)},`,
      `    youtubeId: ${JSON.stringify(t.youtubeId)},`,
      `    genre: ${JSON.stringify(t.genre)},`,
      `    era: ${JSON.stringify(t.era)},`,
      `    year: ${t.year},`,
      `    score: ${t.score},`,
      `    notes: ${JSON.stringify(t.notes)},`,
      `    addedAt: ${JSON.stringify(t.addedAt)},`,
    ]
    return `  {\n${lines.join("\n")}\n  },`
  })
  return `[\n${objects.join("\n")}\n]`
}

export function renderSeedPlaylistsArray(playlists: Playlist[]): string {
  if (playlists.length === 0) return "[]"
  const objects = playlists.map((p) => {
    const trackIds =
      p.trackIds.length === 0
        ? "[]"
        : `[\n${p.trackIds.map((id) => `      ${JSON.stringify(id)},`).join("\n")}\n    ]`
    const lines = [
      `    id: ${JSON.stringify(p.id)},`,
      `    name: ${JSON.stringify(p.name)},`,
    ]
    if (p.description) {
      lines.push(`    description: ${JSON.stringify(p.description)},`)
    }
    lines.push(`    trackIds: ${trackIds},`)
    lines.push(`    curated: true,`)
    lines.push(`    createdAt: ${JSON.stringify(p.createdAt)},`)
    lines.push(`    updatedAt: ${JSON.stringify(p.updatedAt)},`)
    return `  {\n${lines.join("\n")}\n  },`
  })
  return `[\n${objects.join("\n")}\n]`
}

/** Replace `export const NAME = [ ... ]` in a TypeScript source file. */
export function replaceExportedArray(
  source: string,
  exportName: string,
  arrayLiteral: string,
): string {
  const needle = `export const ${exportName}`
  const start = source.indexOf(needle)
  if (start < 0) {
    throw new Error(`Could not find ${needle}`)
  }
  const eq = source.indexOf("=", start)
  if (eq < 0) {
    throw new Error(`Could not find assignment for ${exportName}`)
  }
  const open = source.indexOf("[", eq)
  if (open < 0) {
    throw new Error(`Could not find array for ${exportName}`)
  }
  const close = findMatchingBracket(source, open)
  return source.slice(0, open) + arrayLiteral + source.slice(close + 1)
}

/** Highest `seed-N` id already in the file, so new tracks never reuse dropped ids. */
export function maxSeedIdInSource(source: string): number {
  let max = 0
  for (const m of source.matchAll(/id: "seed-(\d+)"/g)) {
    max = Math.max(max, Number(m[1]))
  }
  return max
}

function findMatchingBracket(src: string, openIdx: number): number {
  let depth = 0
  let i = openIdx
  let inStr: '"' | "'" | "`" | null = null
  let escape = false
  while (i < src.length) {
    const c = src[i]!
    if (inStr) {
      if (escape) {
        escape = false
      } else if (c === "\\") {
        escape = true
      } else if (c === inStr) {
        inStr = null
      }
      i += 1
      continue
    }
    if (c === "/" && src[i + 1] === "/") {
      const nl = src.indexOf("\n", i)
      if (nl < 0) break
      i = nl + 1
      continue
    }
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2)
      if (end < 0) break
      i = end + 2
      continue
    }
    if (c === '"' || c === "'" || c === "`") {
      inStr = c
      i += 1
      continue
    }
    if (c === "[") depth += 1
    else if (c === "]") {
      depth -= 1
      if (depth === 0) return i
    }
    i += 1
  }
  throw new Error("Unbalanced array brackets")
}
