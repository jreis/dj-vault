import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Track } from "../src/types.ts"
import { buildSocialShareUrl } from "../src/lib/shareLink.ts"
import {
  buildTrackShareSet,
  trackShareMeta,
  trackShareSetName,
} from "../src/lib/trackShare.ts"
import { renderShareLandingHtml } from "../functions/_lib/shareLanding.ts"

function track(over: Partial<Track> & Pick<Track, "id" | "title" | "artist">): Track {
  return {
    youtubeId: over.id.padEnd(11, "x").slice(0, 11),
    genre: "Metal",
    era: "90s",
    year: 1991,
    score: 10,
    notes: "Set opener energy",
    addedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  }
}

const sandman = track({
  id: "seed-1",
  title: "Enter Sandman",
  artist: "Metallica",
  youtubeId: "CD-E-LDc384",
})
const puppets = track({
  id: "seed-9",
  title: "Master of Puppets",
  artist: "Metallica",
  youtubeId: "SDddsdZj1Xk",
  era: "80s",
  year: 1986,
  notes: "Thrash masterpiece",
})
const teenSpirit = track({
  id: "seed-2",
  title: "Smells Like Teen Spirit",
  artist: "Nirvana",
  youtubeId: "hTWKbfoikeg",
  genre: "Grunge",
  notes: "Crowd detonator",
})
const coltrane = track({
  id: "seed-j",
  title: "Giant Steps",
  artist: "John Coltrane",
  youtubeId: "2kjv79pVGvI",
  genre: "Jazz",
  era: "60s",
  year: 1960,
  score: 0,
  notes: "",
})
const vault = [sandman, puppets, teenSpirit, coltrane]

describe("buildTrackShareSet", () => {
  it("leads with the shared track, then similar vault tracks", () => {
    const set = buildTrackShareSet(sandman, vault)
    assert.equal(set[0]?.id, sandman.id)
    assert.equal(set[0]?.title, "Enter Sandman")
    assert.ok(set.length >= 3, `expected a set, got ${set.length}`)
    assert.ok(
      set.some((t) => t.id === puppets.id),
      "Metallica / metal kin should ride along",
    )
    assert.equal(set.filter((t) => t.id === sandman.id).length, 1)
  })

  it("still shares a lone track when the vault has no kin", () => {
    const set = buildTrackShareSet(sandman, [sandman])
    assert.deepEqual(
      set.map((t) => t.id),
      [sandman.id],
    )
  })
})

describe("trackShareSetName", () => {
  it("names the set after the seed so the recipient knows why they are here", () => {
    assert.equal(trackShareSetName(sandman), "If you like Enter Sandman")
  })
})

describe("trackShareMeta", () => {
  it("builds a social card around the seed track", () => {
    const meta = trackShareMeta(sandman, 8)
    assert.equal(meta.title, "Enter Sandman — Metallica")
    assert.match(meta.description, /8-track/)
    assert.match(meta.description, /Enter Sandman/)
    assert.equal(
      meta.image,
      "https://i.ytimg.com/vi/CD-E-LDc384/hqdefault.jpg",
    )
  })
})

describe("buildSocialShareUrl", () => {
  it("uses a hash-free path crawlers can unfurl", () => {
    assert.equal(
      buildSocialShareUrl("AbCdEfGh12", "https://jasonreis.dev/djvault/"),
      "https://jasonreis.dev/s/AbCdEfGh12",
    )
  })
})

describe("renderShareLandingHtml", () => {
  it("emits Open Graph tags and sends humans into the vault set", () => {
    const html = renderShareLandingHtml({
      origin: "https://jasonreis.dev",
      shareId: "AbCdEfGh12",
      seed: sandman,
      trackCount: 8,
      setName: "If you like Enter Sandman",
    })
    assert.match(html, /property="og:title"/)
    assert.match(html, /Enter Sandman — Metallica/)
    assert.match(html, /property="og:image"/)
    assert.match(html, /CD-E-LDc384\/hqdefault\.jpg/)
    assert.match(html, /name="twitter:card" content="summary_large_image"/)
    assert.match(html, /\/djvault\/#s=AbCdEfGh12/)
  })

  it("escapes attacker-controlled titles in the social card", () => {
    const html = renderShareLandingHtml({
      origin: "https://jasonreis.dev",
      shareId: "safeid1234",
      seed: {
        ...sandman,
        title: `</title><script>alert(1)</script>`,
        artist: `Metallica "quoted"`,
      },
      trackCount: 3,
      setName: `If you like </title>`,
    })
    assert.equal(html.includes("<script>alert(1)</script>"), false)
    assert.match(html, /&lt;\/title&gt;/)
    assert.match(html, /Metallica &quot;quoted&quot;/)
  })
})
