import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Playlist, Track } from "../src/types.ts"
import {
  catalogToSeedRecords,
  getPublishedCatalog,
  putPublishedCatalog,
  replaceCuratedPlaylists,
  type SeedEnv,
} from "../functions/_lib/seedCatalog.ts"

function track(over: Partial<Track> & Pick<Track, "id" | "title">): Track {
  return {
    artist: "Band",
    youtubeId: over.id.padEnd(11, "x").slice(0, 11),
    genre: "Metal",
    era: "90s",
    year: 1991,
    score: 0,
    notes: "",
    addedAt: "2025-01-01T00:00:00.000Z",
    ...over,
  }
}

function playlist(
  over: Partial<Playlist> & Pick<Playlist, "id" | "name" | "trackIds">,
): Playlist {
  return {
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...over,
  }
}

function memoryEnv(): SeedEnv {
  const kv = new Map<string, string>()
  return {
    SHARES: {
      get: async (key) => kv.get(key) ?? null,
      put: async (key, value) => {
        kv.set(key, value)
      },
    },
  }
}

describe("catalogToSeedRecords", () => {
  it("remaps playlist track ids onto the published seed-N ids", () => {
    const tracks = [
      track({ id: "t_custom", title: "New Song", youtubeId: "11111111111" }),
      track({ id: "seed-2", title: "Kept Seed", youtubeId: "22222222222" }),
    ]
    const playlists = [
      playlist({
        id: "pl_live",
        name: "Tonight's Set",
        trackIds: ["t_custom", "seed-2"],
      }),
    ]

    const catalog = catalogToSeedRecords(tracks, playlists)

    assert.equal(catalog.tracks[0]?.id, "seed-3")
    assert.equal(catalog.tracks[1]?.id, "seed-2")
    assert.equal(catalog.playlists.length, 1)
    assert.deepEqual(catalog.playlists[0]?.trackIds, ["seed-3", "seed-2"])
    assert.equal(catalog.playlists[0]?.curated, true)
    assert.equal(catalog.playlists[0]?.name, "Tonight's Set")
  })

  it("drops playlists whose tracks are gone from the library", () => {
    const tracks = [track({ id: "seed-1", title: "Only Track" })]
    const playlists = [
      playlist({
        id: "jason-grunge",
        name: "Grunge Essentials",
        trackIds: ["seed-99", "seed-100"],
        curated: true,
      }),
    ]

    const catalog = catalogToSeedRecords(tracks, playlists)
    assert.deepEqual(catalog.playlists, [])
  })
})

describe("published catalog KV", () => {
  it("round-trips playlists so new visitors do not get the old defaults", async () => {
    const env = memoryEnv()
    const tracks = [track({ id: "seed-1", title: "Alive" })]
    const playlists = [
      playlist({
        id: "seed-pl-1",
        name: "Tonight's Set",
        trackIds: ["seed-1"],
        curated: true,
      }),
    ]

    const saved = await putPublishedCatalog(env, { tracks, playlists })
    assert.equal(saved.ok, true)

    const loaded = await getPublishedCatalog(env)
    assert.ok(loaded)
    assert.equal(loaded.playlists?.length, 1)
    assert.equal(loaded.playlists?.[0]?.name, "Tonight's Set")
    assert.deepEqual(loaded.playlists?.[0]?.trackIds, ["seed-1"])
  })
})

describe("replaceCuratedPlaylists", () => {
  it("swaps Jason's defaults for the published set and keeps user playlists", () => {
    const current = [
      playlist({
        id: "jason-grunge",
        name: "Grunge Essentials",
        trackIds: ["seed-2"],
        curated: true,
      }),
      playlist({
        id: "pl_mine",
        name: "Dad's Favorites",
        trackIds: ["seed-1"],
      }),
    ]
    const published = [
      playlist({
        id: "seed-pl-1",
        name: "Tonight's Set",
        trackIds: ["seed-3"],
        curated: true,
      }),
    ]

    const next = replaceCuratedPlaylists(current, published)
    assert.deepEqual(
      next.map((p) => p.id),
      ["seed-pl-1", "pl_mine"],
    )
    assert.equal(next[0]?.curated, true)
    assert.equal(next[1]?.curated, undefined)
  })

  it("does not keep a user copy of a playlist that was just published", () => {
    const current = [
      playlist({
        id: "pl_live",
        name: "Tonight's Set",
        trackIds: ["seed-1"],
      }),
    ]
    const published = [
      playlist({
        id: "pl_live",
        name: "Tonight's Set",
        trackIds: ["seed-1"],
        curated: true,
      }),
    ]
    const next = replaceCuratedPlaylists(current, published)
    assert.deepEqual(
      next.map((p) => p.id),
      ["pl_live"],
    )
    assert.equal(next[0]?.curated, true)
  })

  it("leaves current playlists alone when the catalog predates playlist publishing", () => {
    const current = [
      playlist({
        id: "jason-grunge",
        name: "Grunge Essentials",
        trackIds: ["seed-2"],
        curated: true,
      }),
    ]
    assert.equal(replaceCuratedPlaylists(current, null), current)
  })
})
