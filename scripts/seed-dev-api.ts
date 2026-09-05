import fs from "node:fs"
import path from "node:path"
import type { Plugin } from "vite"
import type { Playlist, Track } from "../src/types.ts"
import {
  catalogToSeedRecords,
  parseSeedPlaylistPayload,
  parseSeedTrackPayload,
  passwordMatches,
} from "../functions/_lib/seedCatalog.ts"
import {
  maxSeedIdInSource,
  replaceExportedArray,
  renderSeedPlaylistsArray,
  renderSeedTracksArray,
} from "./seed-source.ts"

const SEED_TRACKS_PATH = path.resolve("src/data/seedTracks.ts")
const SEED_PLAYLISTS_PATH = path.resolve("src/data/seedPlaylists.ts")
const JSON_TYPE = "application/json; charset=utf-8"

type PublishedDevCatalog = { tracks: Track[]; playlists: Playlist[] }

/**
 * Dev stand-in for /api/seed.
 *
 * GET  → in-memory published catalog (null until you save this session)
 * POST → password-gated when SEED_ADMIN_SECRET is set; always writes
 *        src/data/seedTracks.ts and src/data/seedPlaylists.ts so git stays
 *        the source of truth locally.
 */
export function seedDevApi(env: { SEED_ADMIN_SECRET?: string }): Plugin {
  let published: PublishedDevCatalog | null = null

  return {
    name: "seed-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) {
          next()
          return
        }
        const pathName = req.url.split("?")[0] ?? ""
        if (pathName !== "/api/seed" && pathName !== "/api/dev/seed") {
          next()
          return
        }

        if (req.method === "GET") {
          res.statusCode = 200
          res.setHeader("Content-Type", JSON_TYPE)
          res.setHeader("Cache-Control", "no-store")
          res.end(
            JSON.stringify({
              tracks: published?.tracks ?? null,
              playlists: published?.playlists ?? null,
            }),
          )
          return
        }

        if (req.method !== "POST") {
          next()
          return
        }

        try {
          const chunks: Buffer[] = []
          for await (const chunk of req) {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
          }
          const raw = Buffer.concat(chunks).toString("utf8")
          let body: {
            tracks?: unknown
            playlists?: unknown
            password?: unknown
          } = {}
          try {
            body = JSON.parse(raw) as {
              tracks?: unknown
              playlists?: unknown
              password?: unknown
            }
          } catch {
            res.statusCode = 400
            res.setHeader("Content-Type", JSON_TYPE)
            res.end(JSON.stringify({ error: "Invalid JSON body." }))
            return
          }

          const secret = env.SEED_ADMIN_SECRET?.trim() ?? ""
          if (secret && !(await passwordMatches(body.password, secret))) {
            res.statusCode = 401
            res.setHeader("Content-Type", JSON_TYPE)
            res.end(JSON.stringify({ error: "Wrong password." }))
            return
          }

          const parsed = parseSeedTrackPayload(body.tracks)
          if (!parsed) {
            res.statusCode = 400
            res.setHeader("Content-Type", JSON_TYPE)
            res.end(
              JSON.stringify({
                error: "Need a non-empty array of valid tracks.",
              }),
            )
            return
          }

          const parsedPlaylists =
            body.playlists === undefined
              ? (published?.playlists ?? [])
              : parseSeedPlaylistPayload(body.playlists)
          if (parsedPlaylists === null) {
            res.statusCode = 400
            res.setHeader("Content-Type", JSON_TYPE)
            res.end(
              JSON.stringify({
                error: "Playlists must be an array of valid playlists.",
              }),
            )
            return
          }

          const current = fs.readFileSync(SEED_TRACKS_PATH, "utf8")
          const catalog = catalogToSeedRecords(parsed, parsedPlaylists, {
            reservedMax: maxSeedIdInSource(current),
          })
          const nextTracks = replaceExportedArray(
            current,
            "SEED_TRACKS",
            renderSeedTracksArray(catalog.tracks),
          )
          fs.writeFileSync(SEED_TRACKS_PATH, nextTracks)
          const currentPlaylists = fs.readFileSync(SEED_PLAYLISTS_PATH, "utf8")
          const nextPlaylists = replaceExportedArray(
            currentPlaylists,
            "SEED_PLAYLISTS",
            renderSeedPlaylistsArray(catalog.playlists),
          )
          fs.writeFileSync(SEED_PLAYLISTS_PATH, nextPlaylists)
          published = catalog

          res.statusCode = 200
          res.setHeader("Content-Type", JSON_TYPE)
          res.end(
            JSON.stringify({
              ok: true,
              count: catalog.tracks.length,
              playlistCount: catalog.playlists.length,
              wroteFile: true,
            }),
          )
        } catch (err) {
          console.error("[seed-dev-api]", err)
          res.statusCode = 500
          res.setHeader("Content-Type", JSON_TYPE)
          res.end(JSON.stringify({ error: "Could not write seed files" }))
        }
      })
    },
  }
}
