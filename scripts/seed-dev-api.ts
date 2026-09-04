import fs from "node:fs"
import path from "node:path"
import type { Plugin } from "vite"
import type { Track } from "../src/types.ts"
import {
  parseSeedTrackPayload,
  passwordMatches,
  tracksToSeedRecords,
} from "../functions/_lib/seedCatalog.ts"
import {
  maxSeedIdInSource,
  replaceExportedArray,
  renderSeedTracksArray,
} from "./seed-source.ts"

const SEED_TRACKS_PATH = path.resolve("src/data/seedTracks.ts")
const JSON_TYPE = "application/json; charset=utf-8"

/**
 * Dev stand-in for /api/seed.
 *
 * GET  → in-memory published catalog (null until you save this session)
 * POST → password-gated when SEED_ADMIN_SECRET is set; always writes
 *        src/data/seedTracks.ts so git stays the source of truth locally.
 */
export function seedDevApi(env: { SEED_ADMIN_SECRET?: string }): Plugin {
  let published: Track[] | null = null

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
          res.end(JSON.stringify({ tracks: published }))
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
          let body: { tracks?: unknown; password?: unknown } = {}
          try {
            body = JSON.parse(raw) as {
              tracks?: unknown
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

          const current = fs.readFileSync(SEED_TRACKS_PATH, "utf8")
          const seeds = tracksToSeedRecords(parsed, {
            reservedMax: maxSeedIdInSource(current),
          })
          const next = replaceExportedArray(
            current,
            "SEED_TRACKS",
            renderSeedTracksArray(seeds),
          )
          fs.writeFileSync(SEED_TRACKS_PATH, next)
          published = seeds

          res.statusCode = 200
          res.setHeader("Content-Type", JSON_TYPE)
          res.end(JSON.stringify({ ok: true, count: seeds.length, wroteFile: true }))
        } catch (err) {
          console.error("[seed-dev-api]", err)
          res.statusCode = 500
          res.setHeader("Content-Type", JSON_TYPE)
          res.end(JSON.stringify({ error: "Could not write seedTracks.ts" }))
        }
      })
    },
  }
}
