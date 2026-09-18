/** A video plus an optional cue point (concert song start). */
export interface YouTubeClip {
  youtubeId: string
  /** Seconds from the start of the video. 0 means play from the beginning. */
  startSeconds: number
}

const ID_RE = /^[\w-]{11}$/

function parseVideoIdFromUrl(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "")

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0]
    return id && ID_RE.test(id) ? id : null
  }

  if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com"
  ) {
    const v = url.searchParams.get("v")
    if (v && ID_RE.test(v)) return v

    const embed = url.pathname.match(/\/embed\/([\w-]{11})/)
    if (embed) return embed[1] ?? null

    const shorts = url.pathname.match(/\/shorts\/([\w-]{11})/)
    if (shorts) return shorts[1] ?? null
  }

  return null
}

/**
 * Parse a clock or YouTube time token into whole seconds.
 * Accepts `90`, `1:30`, `1:02:03`, `1h2m3s`, `90s`.
 */
export function parseTimestampToSeconds(raw: string): number | null {
  const s = raw.trim().toLowerCase()
  if (!s) return null

  const hms = s.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)
  if (hms && (hms[1] || hms[2] || hms[3])) {
    const h = hms[1] ? Number(hms[1]) : 0
    const m = hms[2] ? Number(hms[2]) : 0
    const sec = hms[3] ? Number(hms[3]) : 0
    return h * 3600 + m * 60 + sec
  }

  const colon = s.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/)
  if (colon) {
    const h = colon[1] ? Number(colon[1]) : 0
    const m = Number(colon[2])
    const sec = Number(colon[3])
    if (m > 59 || sec > 59) return null
    return h * 3600 + m * 60 + sec
  }

  if (/^\d+$/.test(s)) return Number(s)
  return null
}

/** Read `t` / `start` from a YouTube URL (query or `#t=`). */
export function parseYouTubeStartSeconds(input: string): number | null {
  const raw = input.trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    const fromQuery =
      url.searchParams.get("t") ?? url.searchParams.get("start")
    const fromHash = url.hash.startsWith("#t=")
      ? url.hash.slice(3)
      : url.hash.startsWith("#")
        ? new URLSearchParams(url.hash.slice(1)).get("t")
        : null
    const token = fromQuery || fromHash
    if (!token) return null
    return parseTimestampToSeconds(token)
  } catch {
    return null
  }
}

/** Format whole seconds as `m:ss` or `h:mm:ss`. */
export function formatStartTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m)
  const ss = String(sec).padStart(2, "0")
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function clipKey(youtubeId: string, startSeconds = 0): string {
  const start = startSeconds > 0 ? Math.floor(startSeconds) : 0
  return `${youtubeId}@${start}`
}

/** Extract a YouTube video ID from common URL shapes or a bare ID. */
export function parseYouTubeId(input: string): string | null {
  return parseYouTubeClip(input)?.youtubeId ?? null
}

/** Extract video ID and optional start time from a URL or bare ID. */
export function parseYouTubeClip(input: string): YouTubeClip | null {
  const raw = input.trim()
  if (!raw) return null

  if (ID_RE.test(raw)) return { youtubeId: raw, startSeconds: 0 }

  try {
    const url = new URL(raw)
    const youtubeId = parseVideoIdFromUrl(url)
    if (!youtubeId) return null
    const start = parseYouTubeStartSeconds(raw) ?? 0
    return { youtubeId, startSeconds: start > 0 ? start : 0 }
  } catch {
    return null
  }
}

/**
 * Embed URL for a single video, optionally followed by a multi-track playlist.
 * YouTube plays `id` first, then each ID in `playlistIds` (continuous set).
 */
export function youtubeEmbedUrl(
  id: string,
  autoplay = true,
  playlistIds: string[] = [],
): string {
  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    rel: "0",
    modestbranding: "1",
  })
  const rest = playlistIds.filter((pid) => pid && pid !== id)
  if (rest.length > 0) {
    params.set("playlist", rest.join(","))
  }
  return `https://www.youtube.com/embed/${id}?${params.toString()}`
}

export function youtubeWatchUrl(id: string, startSeconds = 0): string {
  const t = startSeconds > 0 ? Math.floor(startSeconds) : 0
  if (t > 0) return `https://www.youtube.com/watch?v=${id}&t=${t}`
  return `https://www.youtube.com/watch?v=${id}`
}

export function youtubeThumbUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
}
