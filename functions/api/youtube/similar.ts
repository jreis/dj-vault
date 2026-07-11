/**
 * Proxy YouTube Data API search for similar / discovery videos.
 * Secret: YOUTUBE_API_KEY (Cloudflare Pages → Settings → Environment variables, encrypt).
 *
 * GET /api/youtube/similar?artist=&title=&genre=&year=&exclude=
 */

interface Env {
  YOUTUBE_API_KEY?: string
}

interface YtSearchItem {
  id?: { videoId?: string; kind?: string }
  snippet?: {
    title?: string
    channelTitle?: string
    thumbnails?: {
      medium?: { url?: string }
      default?: { url?: string }
    }
  }
}

interface YtSearchResponse {
  items?: YtSearchItem[]
  error?: { message?: string; code?: number }
}

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
}

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  })
}

function clampQuery(value: string | null, max = 120): string {
  if (!value) return ""
  return value.trim().slice(0, max)
}

/** Build a music-oriented discovery query from vault track fields. */
function buildSearchQuery(artist: string, title: string, genre: string, year: string): string {
  // Prefer “songs like …” so results skew related rather than the exact upload.
  const parts = [`songs like ${artist} ${title}`.trim()]
  if (genre) parts.push(genre)
  if (year && /^\d{4}$/.test(year)) parts.push(year)
  return parts.join(" ").replace(/\s+/g, " ").slice(0, 200)
}

type PagesContext = {
  request: Request
  env: Env
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const key = context.env.YOUTUBE_API_KEY
  if (!key) {
    return json(
      {
        error: "YouTube discovery is not configured (missing YOUTUBE_API_KEY).",
        code: "missing_key",
      },
      503,
    )
  }

  const url = new URL(context.request.url)
  const artist = clampQuery(url.searchParams.get("artist"))
  const title = clampQuery(url.searchParams.get("title"))
  const genre = clampQuery(url.searchParams.get("genre"), 40)
  const year = clampQuery(url.searchParams.get("year"), 4)
  const excludeRaw = clampQuery(url.searchParams.get("exclude"), 800)

  if (!artist && !title) {
    return json(
      { error: "artist or title is required", code: "bad_request" },
      400,
    )
  }

  const exclude = new Set(
    excludeRaw
      .split(",")
      .map((id) => id.trim())
      .filter((id) => /^[\w-]{11}$/.test(id)),
  )

  const q = buildSearchQuery(artist, title, genre, year)

  const ytUrl = new URL("https://www.googleapis.com/youtube/v3/search")
  ytUrl.searchParams.set("part", "snippet")
  ytUrl.searchParams.set("type", "video")
  ytUrl.searchParams.set("maxResults", "15")
  ytUrl.searchParams.set("q", q)
  ytUrl.searchParams.set("videoEmbeddable", "true")
  ytUrl.searchParams.set("videoCategoryId", "10") // Music
  ytUrl.searchParams.set("safeSearch", "none")
  ytUrl.searchParams.set("key", key)

  let upstream: Response
  try {
    upstream = await fetch(ytUrl.toString(), {
      headers: { Accept: "application/json" },
    })
  } catch {
    return json(
      { error: "Failed to reach YouTube API", code: "upstream" },
      502,
    )
  }

  let data: YtSearchResponse
  try {
    data = (await upstream.json()) as YtSearchResponse
  } catch {
    return json(
      { error: "Invalid response from YouTube API", code: "upstream" },
      502,
    )
  }

  if (!upstream.ok) {
    const msg = data.error?.message ?? `YouTube API error (${upstream.status})`
    const status = upstream.status === 403 || upstream.status === 429 ? 502 : 502
    return json({ error: msg, code: "upstream" }, status)
  }

  const items = (data.items ?? [])
    .map((item) => {
      const youtubeId = item.id?.videoId
      if (!youtubeId || exclude.has(youtubeId)) return null
      const sn = item.snippet
      if (!sn?.title) return null
      return {
        youtubeId,
        title: sn.title,
        channelTitle: sn.channelTitle ?? "",
        thumbnailUrl:
          sn.thumbnails?.medium?.url ??
          sn.thumbnails?.default?.url ??
          `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 12)

  return json(
    { items, query: q },
    200,
    {
      // Cut quota burn when the same track is opened repeatedly
      "Cache-Control": "public, max-age=1800",
    },
  )
}

