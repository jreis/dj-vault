import { decodeSharePayload } from "../../src/lib/sharePayload.ts"
import { trackShareMeta } from "../../src/lib/trackShare.ts"

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function renderShareLandingHtml(opts: {
  origin: string
  shareId: string
  seed: { title: string; artist: string; youtubeId: string } | null
  trackCount: number
  setName: string | null
}): string {
  const origin = opts.origin.replace(/\/+$/, "")
  const appHref = `${origin}/djvault/#s=${encodeURIComponent(opts.shareId)}`
  const canonical = `${origin}/s/${encodeURIComponent(opts.shareId)}`
  const seed = opts.seed
  const meta = seed
    ? trackShareMeta(seed, opts.trackCount)
    : {
        title: "DJ Vault set",
        description: "Open this shared set in DJ Vault.",
        image: `${origin}/favicon.svg`,
      }
  const heading = opts.setName?.trim() || meta.title
  const countLabel =
    opts.trackCount > 1 ? `${opts.trackCount} tracks` : "a track"

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(meta.title)} · DJ Vault</title>
  <meta name="description" content="${escapeHtml(meta.description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="DJ Vault" />
  <meta property="og:title" content="${escapeHtml(meta.title)}" />
  <meta property="og:description" content="${escapeHtml(meta.description)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:image" content="${escapeHtml(meta.image)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
  <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
  <meta name="twitter:image" content="${escapeHtml(meta.image)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(appHref)}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: Inter, system-ui, sans-serif; background: #0c0a09; color: #e7e5e4;
      text-align: center; padding: 2rem; }
    a { color: #fbbf24; }
    p { color: #a8a29e; }
  </style>
</head>
<body>
  <main>
    <p>Opening ${escapeHtml(heading)} · ${escapeHtml(countLabel)}</p>
    <p><a href="${escapeHtml(appHref)}">Continue to DJ Vault</a></p>
  </main>
  <script>location.replace(${JSON.stringify(appHref)})</script>
</body>
</html>
`
}

export function htmlForShare(
  origin: string,
  shareId: string,
  encoded: string,
): string {
  const parsed = decodeSharePayload(encoded)
  return renderShareLandingHtml({
    origin,
    shareId,
    seed: parsed?.tracks[0] ?? null,
    trackCount: parsed?.tracks.length ?? 0,
    setName: parsed?.name ?? null,
  })
}

export function renderShareMissingHtml(origin: string): string {
  const appHref = `${origin.replace(/\/+$/, "")}/djvault/`
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Set not found · DJ Vault</title>
  <meta name="robots" content="noindex" />
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: Inter, system-ui, sans-serif; background: #0c0a09; color: #e7e5e4;
      text-align: center; padding: 2rem; }
    a { color: #fbbf24; }
    p { color: #a8a29e; }
  </style>
</head>
<body>
  <main>
    <p>This shared set is gone or the link is wrong.</p>
    <p><a href="${escapeHtml(appHref)}">Open DJ Vault</a></p>
  </main>
</body>
</html>
`
}
