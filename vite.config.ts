import { defineConfig, loadEnv, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { handleSimilarSearch } from "./scripts/youtube-similar-handler.ts"
import {
  createDevShare,
  getDevShare,
} from "./scripts/share-dev-store.ts"

/** Dev-only /api/youtube/similar so local SPA can discover without wrangler. */
function youtubeSimilarDevApi(env: {
  YOUTUBE_API_KEY?: string
  YOUTUBE_DISCOVERY_ENABLED?: string
}): Plugin {
  return {
    name: "youtube-similar-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || req.method !== "GET") {
          next()
          return
        }
        const path = req.url.split("?")[0]
        if (path !== "/api/youtube/similar") {
          next()
          return
        }

        try {
          const host = req.headers.host ?? "localhost"
          const url = new URL(req.url, `http://${host}`)
          const result = await handleSimilarSearch(url.searchParams, env)
          res.statusCode = result.status
          res.setHeader("Content-Type", "application/json; charset=utf-8")
          if (result.cacheControl) {
            res.setHeader("Cache-Control", result.cacheControl)
          }
          res.end(JSON.stringify(result.body))
        } catch (err) {
          console.error("[youtube-similar-dev-api]", err)
          res.statusCode = 500
          res.setHeader("Content-Type", "application/json; charset=utf-8")
          res.end(
            JSON.stringify({
              error: "Internal discovery error",
              code: "upstream",
            }),
          )
        }
      })
    },
  }
}

/** Dev-only short share store (in-memory stand-in for Cloudflare KV). */
function shareDevApi(): Plugin {
  return {
    name: "share-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) {
          next()
          return
        }
        const path = req.url.split("?")[0] ?? ""

        // POST /api/share
        if (path === "/api/share" && req.method === "POST") {
          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
            }
            const raw = Buffer.concat(chunks).toString("utf8")
            let body: { encoded?: string } = {}
            try {
              body = JSON.parse(raw) as { encoded?: string }
            } catch {
              res.statusCode = 400
              res.setHeader("Content-Type", "application/json; charset=utf-8")
              res.end(JSON.stringify({ error: "Invalid JSON body." }))
              return
            }
            const result = createDevShare(body.encoded ?? "")
            if (!result.ok) {
              res.statusCode = result.status
              res.setHeader("Content-Type", "application/json; charset=utf-8")
              res.end(JSON.stringify({ error: result.error }))
              return
            }
            res.statusCode = 201
            res.setHeader("Content-Type", "application/json; charset=utf-8")
            res.end(JSON.stringify({ id: result.id }))
          } catch (err) {
            console.error("[share-dev-api]", err)
            res.statusCode = 500
            res.setHeader("Content-Type", "application/json; charset=utf-8")
            res.end(JSON.stringify({ error: "Internal share error" }))
          }
          return
        }

        // GET /api/share/:id
        const match = path.match(/^\/api\/share\/([a-zA-Z0-9_-]{4,32})$/)
        if (match && req.method === "GET") {
          const result = getDevShare(match[1]!)
          if (!result.ok) {
            res.statusCode = result.status
            res.setHeader("Content-Type", "application/json; charset=utf-8")
            res.end(JSON.stringify({ error: result.error }))
            return
          }
          res.statusCode = 200
          res.setHeader("Content-Type", "application/json; charset=utf-8")
          res.end(JSON.stringify({ encoded: result.encoded }))
          return
        }

        next()
      })
    },
  }
}

// Hosted at https://jasonreis.dev/djvault/ (Cloudflare Pages publish root = dist/)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  return {
    base: "/djvault/",
    plugins: [
      react(),
      tailwindcss(),
      youtubeSimilarDevApi({
        YOUTUBE_API_KEY: env.YOUTUBE_API_KEY,
        YOUTUBE_DISCOVERY_ENABLED: env.YOUTUBE_DISCOVERY_ENABLED,
      }),
      shareDevApi(),
    ],
    build: {
      outDir: "dist/djvault",
      emptyOutDir: true,
    },
  }
})
