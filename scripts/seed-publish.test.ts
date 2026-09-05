import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { onRequestPost } from "../functions/api/seed/index.ts"
import {
  getPublishedCatalog,
  passwordMatches,
  type SeedEnv,
} from "../functions/_lib/seedCatalog.ts"
import {
  consumeCuratorUnlock,
  curatorFlagInUrl,
  CURATOR_STORAGE_KEY,
  shouldShowSeedPublisher,
} from "../src/lib/curator.ts"
import type { Track } from "../src/types.ts"

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

function memoryEnv(secret = "s3cret"): SeedEnv {
  const kv = new Map<string, string>()
  return {
    SEED_ADMIN_SECRET: secret,
    SHARES: {
      get: async (key) => kv.get(key) ?? null,
      put: async (key, value) => {
        kv.set(key, value)
      },
    },
  }
}

async function postSeed(
  env: SeedEnv,
  body: unknown,
): Promise<Response> {
  return onRequestPost({
    request: new Request("https://jasonreis.dev/api/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    env,
  })
}

describe("shouldShowSeedPublisher", () => {
  it("hides Save as seed from visitors on the live site", () => {
    assert.equal(
      shouldShowSeedPublisher({
        isDev: false,
        href: "https://jasonreis.dev/djvault/",
        sessionUnlocked: false,
      }),
      false,
    )
  })

  it("shows Save as seed in local dev", () => {
    assert.equal(
      shouldShowSeedPublisher({
        isDev: true,
        href: "http://localhost:5173/djvault/",
        sessionUnlocked: false,
      }),
      true,
    )
  })

  it("shows Save as seed when the curator flag is in the URL", () => {
    assert.equal(
      shouldShowSeedPublisher({
        isDev: false,
        href: "https://jasonreis.dev/djvault/?curator",
        sessionUnlocked: false,
      }),
      true,
    )
    assert.equal(
      shouldShowSeedPublisher({
        isDev: false,
        href: "https://jasonreis.dev/djvault/#curator",
        sessionUnlocked: false,
      }),
      true,
    )
  })

  it("keeps Save as seed after the curator session is unlocked", () => {
    assert.equal(
      shouldShowSeedPublisher({
        isDev: false,
        href: "https://jasonreis.dev/djvault/",
        sessionUnlocked: true,
      }),
      true,
    )
  })
})

describe("consumeCuratorUnlock", () => {
  it("remembers the curator flag and strips it from the URL", () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
    }
    const loc = {
      href: "https://jasonreis.dev/djvault/?curator",
      pathname: "/djvault/",
      search: "?curator",
      hash: "",
    }
    let replaced = ""
    const unlocked = consumeCuratorUnlock(
      loc,
      {
        replaceState(_data, _unused, url) {
          replaced = url
        },
      },
      storage,
    )
    assert.equal(unlocked, true)
    assert.equal(store.get(CURATOR_STORAGE_KEY), "1")
    assert.equal(replaced, "/djvault/")
  })
})

describe("curatorFlagInUrl", () => {
  it("treats only an explicit curator flag as an unlock", () => {
    assert.equal(curatorFlagInUrl("https://jasonreis.dev/djvault/"), false)
    assert.equal(
      curatorFlagInUrl("https://jasonreis.dev/djvault/?q=curator"),
      false,
    )
    assert.equal(
      curatorFlagInUrl("https://jasonreis.dev/djvault/?curator"),
      true,
    )
    assert.equal(
      curatorFlagInUrl("https://jasonreis.dev/djvault/?curator=1"),
      true,
    )
    assert.equal(
      curatorFlagInUrl("https://jasonreis.dev/djvault/#curator"),
      true,
    )
  })
})

describe("POST /api/seed", () => {
  const catalog = {
    password: "s3cret",
    tracks: [track({ id: "seed-1", title: "Alive" })],
    playlists: [],
  }

  it("rejects publish when the admin secret is not configured", async () => {
    const res = await postSeed(
      memoryEnv(""),
      catalog,
    )
    assert.equal(res.status, 503)
    const env = memoryEnv("")
    assert.equal(await getPublishedCatalog(env), null)
  })

  it("rejects a wrong or empty password", async () => {
    const env = memoryEnv()
    const wrong = await postSeed(env, { ...catalog, password: "nope" })
    assert.equal(wrong.status, 401)
    const empty = await postSeed(env, { ...catalog, password: "" })
    assert.equal(empty.status, 401)
    assert.equal(await getPublishedCatalog(env), null)
  })

  it("publishes only with the curator password", async () => {
    const env = memoryEnv()
    const res = await postSeed(env, catalog)
    assert.equal(res.status, 200)
    const saved = await getPublishedCatalog(env)
    assert.equal(saved?.tracks[0]?.title, "Alive")
  })
})

describe("passwordMatches", () => {
  it("does not match an empty secret or empty guess", async () => {
    assert.equal(await passwordMatches("s3cret", ""), false)
    assert.equal(await passwordMatches("", "s3cret"), false)
    assert.equal(await passwordMatches("s3cret", "s3cret"), true)
    assert.equal(await passwordMatches("nope", "s3cret"), false)
  })
})
