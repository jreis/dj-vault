/**
 * Shared YouTube similar-search core for CF Pages + Vite dev middleware.
 *
 * Cost guardrails:
 * - YOUTUBE_DISCOVERY_ENABLED=false|0|off|no hard-disables API calls (key can stay set)
 * - On quotaExceeded / dailyLimitExceeded, trip a circuit breaker until midnight Pacific
 *   (YouTube free quota reset) so we stop burning units / risking paid overages
 */

export type SimilarSearchResult = {
  status: number
  body: Record<string, unknown>
  cacheControl?: string
}

export type DiscoveryEnv = {
  YOUTUBE_API_KEY?: string
  /** Set to false/0/off/no to hard-disable discovery without removing the API key. */
  YOUTUBE_DISCOVERY_ENABLED?: string
}

/** In-process breaker (per isolate / Node process). */
let quotaBlockedUntilMs = 0

const QUOTA_CACHE_URL = "https://dj-vault.internal/youtube-discovery-quota-blocked"

function parseFlagOff(value: string | undefined): boolean {
  if (value == null || value === "") return false
  const v = value.trim().toLowerCase()
  return v === "0" || v === "false" || v === "off" || v === "no" || v === "disabled"
}

/** True when discovery should call YouTube (key present and not hard-disabled). */
export function isDiscoveryEnabled(env: DiscoveryEnv): boolean {
  if (parseFlagOff(env.YOUTUBE_DISCOVERY_ENABLED)) return false
  return Boolean(env.YOUTUBE_API_KEY?.trim())
}

/** Next midnight America/Los_Angeles (YouTube Data API daily quota reset). */
export function nextMidnightPacificMs(fromMs = Date.now()): number {
  const dayKey = (ms: number) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(ms))

  const today = dayKey(fromMs)
  const step = 15 * 60 * 1000
  let t = fromMs
  while (dayKey(t) === today && t - fromMs < 48 * 60 * 60 * 1000) {
    t += step
  }
  // Refine to the first ms of the new Pacific calendar day
  let lo = t - step
  let hi = t
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2)
    if (dayKey(mid) === today) lo = mid
    else hi = mid
  }
  return hi
}

export function isQuotaExceededMessage(status: number, message?: string): boolean {
  if (status !== 403 && status !== 429) return false
  const m = (message ?? "").toLowerCase()
  return (
    m.includes("quotaexceeded") ||
    m.includes("daily limit") ||
    m.includes("dailylimitexceeded") ||
    m.includes("quota") ||
    m.includes("rate limit") ||
    m.includes("userratelimitexceeded")
  )
}

function memoryBlocked(): boolean {
  return Date.now() < quotaBlockedUntilMs
}

function tripMemoryBreaker(): void {
  quotaBlockedUntilMs = nextMidnightPacificMs()
}

type CacheStorageLike = {
  default?: {
    match: (req: Request) => Promise<Response | undefined>
    put: (req: Request, res: Response) => Promise<void>
  }
}

function cachesDefault() {
  const cachesApi = (globalThis as unknown as { caches?: CacheStorageLike })
    .caches
  return cachesApi?.default
}

/** Optional Cache API so CF isolates share the “quota burned” flag. */
async function cacheGetBlocked(): Promise<boolean> {
  try {
    const cache = cachesDefault()
    if (!cache) return false
    const hit = await cache.match(new Request(QUOTA_CACHE_URL))
    return Boolean(hit)
  } catch {
    return false
  }
}

async function cacheTripBreaker(): Promise<void> {
  const until = nextMidnightPacificMs()
  quotaBlockedUntilMs = until
  const maxAge = Math.max(60, Math.floor((until - Date.now()) / 1000))
  try {
    const cache = cachesDefault()
    if (!cache) return
    await cache.put(
      new Request(QUOTA_CACHE_URL),
      new Response("1", {
        headers: {
          "Cache-Control": `public, max-age=${maxAge}`,
          "Content-Type": "text/plain",
        },
      }),
    )
  } catch {
    // ignore — memory breaker still holds in this isolate
  }
}

export async function isQuotaCircuitOpen(): Promise<boolean> {
  if (memoryBlocked()) return true
  if (await cacheGetBlocked()) {
    // Align in-memory so subsequent checks in this isolate are free
    tripMemoryBreaker()
    return true
  }
  return false
}

export async function tripQuotaCircuit(): Promise<void> {
  await cacheTripBreaker()
}

function disabledResult(reason: "disabled" | "quota_exceeded"): SimilarSearchResult {
  if (reason === "disabled") {
    return {
      status: 503,
      body: {
        error:
          "YouTube discovery is disabled (YOUTUBE_DISCOVERY_ENABLED). Vault similar + search links still work.",
        code: "disabled",
      },
    }
  }
  return {
    status: 503,
    body: {
      error:
        "YouTube free API quota is exhausted for today. Discovery is paused until the daily reset (midnight Pacific). Vault similar + search links still work.",
      code: "quota_exceeded",
    },
    // Avoid clients hammering while blocked
    cacheControl: "public, max-age=300",
  }
}

function buildSearchQuery(
  artist: string,
  title: string,
  genre: string,
  year: string,
): string {
  const parts = [`songs like ${artist} ${title}`.trim()]
  if (genre) parts.push(genre)
  if (year && /^\d{4}$/.test(year)) parts.push(year)
  return parts.join(" ").replace(/\s+/g, " ").slice(0, 200)
}

/**
 * Run similar search. Never calls Google when disabled or quota circuit is open.
 */
export async function handleSimilarSearch(
  params: URLSearchParams,
  env: DiscoveryEnv,
): Promise<SimilarSearchResult> {
  if (parseFlagOff(env.YOUTUBE_DISCOVERY_ENABLED)) {
    return disabledResult("disabled")
  }

  const apiKey = env.YOUTUBE_API_KEY?.trim()
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

  if (await isQuotaCircuitOpen()) {
    return disabledResult("quota_exceeded")
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

  const q = buildSearchQuery(artist, title, genre, year)

  const ytUrl = new URL("https://www.googleapis.com/youtube/v3/search")
  ytUrl.searchParams.set("part", "snippet")
  ytUrl.searchParams.set("type", "video")
  ytUrl.searchParams.set("maxResults", "15")
  ytUrl.searchParams.set("q", q)
  ytUrl.searchParams.set("videoEmbeddable", "true")
  ytUrl.searchParams.set("videoCategoryId", "10") // Music
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
    error?: { message?: string; errors?: Array<{ reason?: string }> }
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
    const msg =
      data?.error?.message ?? `YouTube API error (${upstream.status})`
    const reasons = (data?.error?.errors ?? [])
      .map((e) => e.reason ?? "")
      .join(" ")
    if (isQuotaExceededMessage(upstream.status, `${msg} ${reasons}`)) {
      await tripQuotaCircuit()
      return disabledResult("quota_exceeded")
    }
    return {
      status: 502,
      body: { error: msg, code: "upstream" },
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
    // Cut quota burn when the same track is opened repeatedly
    cacheControl: "public, max-age=1800",
  }
}
