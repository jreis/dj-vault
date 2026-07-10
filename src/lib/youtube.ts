/** Extract a YouTube video ID from common URL shapes or a bare ID. */
export function parseYouTubeId(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  // Bare ID (11 chars, alphanum + _ -)
  if (/^[\w-]{11}$/.test(raw)) return raw

  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./, "")

    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0]
      return id && /^[\w-]{11}$/.test(id) ? id : null
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = url.searchParams.get("v")
      if (v && /^[\w-]{11}$/.test(v)) return v

      const embed = url.pathname.match(/\/embed\/([\w-]{11})/)
      if (embed) return embed[1]

      const shorts = url.pathname.match(/\/shorts\/([\w-]{11})/)
      if (shorts) return shorts[1]
    }
  } catch {
    // not a URL
  }

  return null
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

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`
}

export function youtubeThumbUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
}
