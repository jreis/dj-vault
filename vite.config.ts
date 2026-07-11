import { defineConfig, loadEnv, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { handleSimilarSearch } from "./scripts/youtube-similar-handler.ts"

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
    ],
    build: {
      outDir: "dist/djvault",
      emptyOutDir: true,
    },
  }
})
