/**
 * Assemble Cloudflare Pages publish root for path /djvault/.
 *
 * Vite emits to dist/djvault/ (assets use base /djvault/).
 * This writes SPA rewrites + a root redirect so the site works on Pages.
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"

const root = join(process.cwd(), "dist")
const appDir = join(root, "djvault")

if (!existsSync(appDir)) {
  console.error(
    "cf-pages: expected dist/djvault/ — run vite build first (outDir: dist/djvault).",
  )
  process.exit(1)
}

mkdirSync(root, { recursive: true })

// Static files win over redirects on Cloudflare Pages.
// SPA fallback for client-side routes under /djvault.
writeFileSync(
  join(root, "_redirects"),
  [
    "# Cloudflare Pages — https://developers.cloudflare.com/pages/configuration/redirects/",
    "/djvault/*  /djvault/index.html  200",
    "/           /djvault/            302",
    "",
  ].join("\n"),
)

// Apex fallback if someone hits the domain root before portfolio exists
writeFileSync(
  join(root, "index.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0;url=/djvault/" />
    <link rel="canonical" href="/djvault/" />
    <title>DJ Vault</title>
    <script>location.replace("/djvault/" + location.search + location.hash)</script>
  </head>
  <body>
    <p><a href="/djvault/">Continue to DJ Vault</a></p>
  </body>
</html>
`,
)

console.log("cf-pages: wrote dist/_redirects and dist/index.html → /djvault/")
