/**
 * Shared YouTube similar-search handler for Vite dev middleware.
 * Mirrors functions/api/youtube/similar.ts (keep behavior in sync).
 */

export type SimilarSearchResult = {
  status: number
  body: Record<string, unknown>
  cacheControl?: string
}

export async function handleSimilarSearch(
  params: URLSearchParams,
  apiKey: string | undefined,
): Promise<SimilarSearchResult> {
  if (!apiKey) {
    return {
      status: 503,
      body: {
        error:
          "YouTube discovery is not configured (missing YOUTUBE_API_KEY).",
        code: "missing_key",
      },
    }
  }

  const artist = (params.get("artist") ?? "").trim().slice(0, 120)
  const title = (params.get("title") ?? "").trim().slice(0, 120)
  const genre = (params.get("genre") ?? "").trim().slice(0, 40)
  const year = (params.get("year") ?? "").trim().slice(0, 4)
  const excludeRaw = (params.get("exclude") ?? "").trim().slice(0, 800)

  if (!artist && !title) {
    return {
      status: 400,
      body: { error: "artist or title is required", code: "bad_request" },
    }
  }

  const exclude = new Set(
    excludeRaw
      .split(",")
      .map((id) => id.trim())
      .filter((id) => /^[\w-]{11}$/.test(id)),
  )

  const parts = [`songs like ${artist} ${title}`.trim()]
  if (genre) parts.push(genre)
  if (year && /^\d{4}$/.test(year)) parts.push(year)
  const q = parts.join(" ").replace(/\s+/g, " ").slice(0, 200)

  const ytUrl = new URL("https://www.googleapis.com/youtube/v3/search")
  ytUrl.searchParams.set("part", "snippet")
  ytUrl.searchParams.set("type", "video")
  ytUrl.searchParams.set("maxResults", "15")
  ytUrl.searchParams.set("q", q)
  ytUrl.searchParams.set("videoEmbeddable", "true")
  ytUrl.searchParams.set("videoCategoryId", "10")
  ytUrl.searchParams.set("safeSearch", "none")
  ytUrl.searchParams.set("key", apiKey)

  let upstream: Response
  try {
    upstream = await fetch(ytUrl.toString(), {
      headers: { Accept: "application/json" },
    })
  } catch {
    return {
      status: 502,
      body: { error: "Failed to reach YouTube API", code: "upstream" },
    }
  }

  let data: {
    items?: Array<{
      id?: { videoId?: string }
      snippet?: {
        title?: string
        channelTitle?: string
        thumbnails?: {
          medium?: { url?: string }
          default?: { url?: string }
        }
      }
    }>
    error?: { message?: string }
  }
  try {
    data = (await upstream.json()) as typeof data
  } catch {
    return {
      status: 502,
      body: {
        error: "Invalid response from YouTube API",
        code: "upstream",
      },
    }
  }

  if (!upstream.ok) {
    return {
      status: 502,
      body: {
        error: data?.error?.message ?? `YouTube API error (${upstream.status})`,
        code: "upstream",
      },
    }
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

  return {
    status: 200,
    body: { items, query: q },
    cacheControl: "public, max-age=1800",
  }
}
