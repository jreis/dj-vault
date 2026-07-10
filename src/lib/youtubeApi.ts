/**
 * Thin wrapper around the YouTube IFrame Player API.
 * No API key required — only the public player script.
 */

export type YtErrorCode = 2 | 5 | 100 | 101 | 150

/** Human-readable reasons for YT.Player onError codes. */
export function youtubeErrorMessage(code: number): string {
  switch (code) {
    case 2:
      return "Invalid video ID"
    case 5:
      return "Player error (HTML5)"
    case 100:
      return "Video not found or private"
    case 101:
    case 150:
      return "Embedding disabled for this video"
    default:
      return "Video unavailable"
  }
}

type ReadyCallback = () => void

let loadPromise: Promise<void> | null = null

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        config: YtPlayerConfig,
      ) => YtPlayer
      PlayerState: {
        ENDED: number
        PLAYING: number
        PAUSED: number
        BUFFERING: number
        CUED: number
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

export interface YtPlayer {
  destroy: () => void
  loadVideoById: (id: string) => void
  cueVideoById: (id: string) => void
  playVideo: () => void
  stopVideo: () => void
  getPlayerState: () => number
}

interface YtPlayerConfig {
  videoId: string
  width?: string | number
  height?: string | number
  playerVars?: Record<string, string | number>
  events?: {
    onReady?: (e: { target: YtPlayer }) => void
    onError?: (e: { data: number; target: YtPlayer }) => void
    onStateChange?: (e: { data: number; target: YtPlayer }) => void
  }
}

const pendingReady: ReadyCallback[] = []

/** Load https://www.youtube.com/iframe_api once; resolves when YT is ready. */
export function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API requires a browser"))
  }
  if (window.YT?.Player) return Promise.resolve()

  if (loadPromise) return loadPromise

  loadPromise = new Promise<void>((resolve, reject) => {
    const finish = () => {
      if (window.YT?.Player) resolve()
      else reject(new Error("YouTube API failed to load"))
    }

    pendingReady.push(finish)

    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      const cbs = pendingReady.splice(0, pendingReady.length)
      for (const cb of cbs) cb()
    }

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      tag.async = true
      tag.onerror = () => {
        loadPromise = null
        reject(new Error("Failed to load YouTube iframe API script"))
      }
      document.head.appendChild(tag)
    }
  })

  return loadPromise
}

export interface CreatePlayerOptions {
  element: HTMLElement
  videoId: string
  autoplay?: boolean
  onEnded?: () => void
  onError?: (code: number) => void
  onReady?: () => void
}

/**
 * Create a YT.Player bound to `element`. Caller must call `destroy()` on unmount.
 */
export async function createYouTubePlayer(
  options: CreatePlayerOptions,
): Promise<YtPlayer> {
  await loadYouTubeApi()
  const YT = window.YT
  if (!YT?.Player) throw new Error("YouTube API not available")

  return new Promise((resolve) => {
    const player = new YT.Player(options.element, {
      videoId: options.videoId,
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: options.autoplay === false ? 0 : 1,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        // Origin helps some embed restriction checks; ignore if unavailable.
        ...(typeof window !== "undefined" && window.location?.origin
          ? { origin: window.location.origin }
          : {}),
      },
      events: {
        onReady: () => {
          options.onReady?.()
          resolve(player)
        },
        onError: (e) => {
          options.onError?.(e.data)
        },
        onStateChange: (e) => {
          // 0 === ENDED
          if (e.data === 0 || e.data === YT.PlayerState?.ENDED) {
            options.onEnded?.()
          }
        },
      },
    })
  })
}
