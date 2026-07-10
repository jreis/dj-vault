/**
 * Assemble Cloudflare Pages publish root:
 *   /              → portfolio landing (landing/)
 *   /djvault/      → DJ Vault SPA (Vite outDir)
 */
import {
  writeFileSync,
  mkdirSync,
  existsSync,
  cpSync,
  copyFileSync,
} from "node:fs"
import { join } from "node:path"

const root = join(process.cwd(), "dist")
const appDir = join(root, "djvault")
const landingDir = join(process.cwd(), "landing")
const publicDir = join(process.cwd(), "public")

if (!existsSync(appDir)) {
  console.error(
    "cf-pages: expected dist/djvault/ — run vite build first (outDir: dist/djvault).",
  )
  process.exit(1)
}

if (!existsSync(join(landingDir, "index.html"))) {
  console.error("cf-pages: expected landing/index.html")
  process.exit(1)
}

mkdirSync(root, { recursive: true })

// Portfolio home
cpSync(join(landingDir, "index.html"), join(root, "index.html"))
cpSync(join(landingDir, "styles.css"), join(root, "styles.css"))

// Shared favicon at site root
const favicon = join(publicDir, "favicon.svg")
if (existsSync(favicon)) {
  copyFileSync(favicon, join(root, "favicon.svg"))
}

// Static files win over redirects on Cloudflare Pages.
// SPA fallback for client-side routes under /djvault only.
writeFileSync(
  join(root, "_redirects"),
  [
    "# Cloudflare Pages — https://developers.cloudflare.com/pages/configuration/redirects/",
    "/djvault/*  /djvault/index.html  200",
    "",
  ].join("\n"),
)

console.log("cf-pages: landing → dist/ + SPA fallback for /djvault/*")
