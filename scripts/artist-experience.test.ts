import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  artistThemeStyle,
  resolveArtistExperience,
} from "../src/lib/artistExperience.ts"
import { matchesQuery } from "../src/lib/filterTracks.ts"
import type { Track } from "../src/types.ts"

function track(over: Partial<Track> & Pick<Track, "id" | "title" | "artist">): Track {
  return {
    youtubeId: "x",
    genre: "Metal",
    era: "70s",
    year: 1970,
    score: 1,
    notes: "Roots of metal",
    addedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  }
}

describe("resolveArtistExperience", () => {
  it("opens a Ghost destination from a ghost query", () => {
    const xp = resolveArtistExperience("ghost")
    assert.ok(xp)
    assert.equal(xp.name, "Ghost")
    assert.equal(xp.tagline, "Occult rock in papal dress")
    assert.deepEqual(xp.influences, [
      "Blue Öyster Cult",
      "Mercyful Fate",
      "Candlemass",
      "Black Sabbath",
      "ABBA",
    ])
    assert.ok(xp.kin.includes("Volbeat"))
    assert.ok(xp.kin.includes("Avatar"))
    assert.equal(xp.theme.id, "ghost")
    assert.equal(xp.theme.accent, "#d4af37")
  })

  it("is case-insensitive and trims", () => {
    assert.equal(resolveArtistExperience("  GHOST  ")?.name, "Ghost")
  })

  it("activates on a unique 4+ letter prefix", () => {
    assert.equal(resolveArtistExperience("ghos")?.name, "Ghost")
  })

  it("does not take over for song titles or empty search", () => {
    assert.equal(resolveArtistExperience(""), null)
    assert.equal(resolveArtistExperience("   "), null)
    assert.equal(resolveArtistExperience("Dance Macabre"), null)
    assert.equal(resolveArtistExperience("Enter Sandman"), null)
  })

  it("does not take over for short ambiguous prefixes", () => {
    assert.equal(resolveArtistExperience("g"), null)
    assert.equal(resolveArtistExperience("in"), null)
    assert.equal(resolveArtistExperience("to"), null)
  })

  it("does not invent a world for an unknown artist", () => {
    assert.equal(resolveArtistExperience("Charli XCX"), null)
  })

  it("opens Metallica with a steel theme", () => {
    const xp = resolveArtistExperience("metallica")
    assert.equal(xp?.name, "Metallica")
    assert.equal(xp?.theme.id, "metallica")
    assert.equal(xp?.theme.accent, "#7eb8d4")
  })
})

describe("artist destination search", () => {
  it("does not treat Sabbath as an ABBA track", () => {
    const sabbath = track({
      id: "sab",
      title: "Paranoid",
      artist: "Black Sabbath",
    })
    const ghost = track({
      id: "gh",
      title: "Dance Macabre",
      artist: "Ghost",
      year: 2018,
      era: "10s",
    })
    assert.equal(matchesQuery(sabbath, "ABBA"), false)
    assert.equal(matchesQuery(ghost, "ghost"), true)
    assert.equal(matchesQuery(ghost, "ABBA"), false)
  })
})

describe("artistThemeStyle", () => {
  it("maps Ghost gold onto the vault amber token", () => {
    const xp = resolveArtistExperience("Ghost")
    assert.ok(xp)
    const style = artistThemeStyle(xp.theme)
    assert.equal(style["--color-vault-amber"], "#d4af37")
    assert.equal(style["--color-vault-bg"], "#06110c")
  })
})
