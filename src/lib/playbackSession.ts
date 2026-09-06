/**
 * Lock-screen + keep-awake helpers for playback.
 * YouTube embeds still pause on iOS when the phone is locked; these APIs
 * cover Android lock-screen controls and prevent auto-sleep while the tab
 * is in the foreground.
 */

export interface TrackSessionInfo {
  title: string
  artist: string
  artworkUrl: string
}

export interface MediaSessionMetadata {
  title?: string
  artist?: string
  album?: string
  artwork?: Array<{ src: string; sizes?: string; type?: string }>
}

export interface MediaSessionLike {
  metadata: MediaSessionMetadata | null
  playbackState: string
  setActionHandler(action: string, handler: (() => void) | null): void
}

export interface WakeLockSentinelLike {
  released: boolean
  release(): Promise<void>
}

export interface WakeLockLike {
  request(type: "screen"): Promise<WakeLockSentinelLike>
}

const MEDIA_ACTIONS = ["play", "pause", "nexttrack", "previoustrack"] as const

export function bindMediaSession(
  session: MediaSessionLike | null | undefined,
  track: TrackSessionInfo | null,
  actions: {
    onPlay?: () => void
    onPause?: () => void
    onNext?: () => void
    onPrev?: () => void
  },
): void {
  if (!session) return

  if (!track) {
    session.metadata = null
    session.playbackState = "none"
    for (const action of MEDIA_ACTIONS) {
      try {
        session.setActionHandler(action, null)
      } catch {
        // Older browsers reject unknown actions.
      }
    }
    return
  }

  const init: MediaSessionMetadata = {
    title: track.title,
    artist: track.artist,
    album: "DJ Vault",
    artwork: [
      { src: track.artworkUrl, sizes: "320x180", type: "image/jpeg" },
    ],
  }
  const Ctor = (
    globalThis as unknown as {
      MediaMetadata?: new (m: MediaSessionMetadata) => MediaSessionMetadata
    }
  ).MediaMetadata
  session.metadata = Ctor ? new Ctor(init) : init
  session.playbackState = "playing"

  const handlers: Record<string, (() => void) | undefined> = {
    play: actions.onPlay,
    pause: actions.onPause,
    nexttrack: actions.onNext,
    previoustrack: actions.onPrev,
  }
  for (const action of MEDIA_ACTIONS) {
    try {
      session.setActionHandler(action, handlers[action] ?? null)
    } catch {
      // ignore unsupported action
    }
  }
}

export async function syncScreenWakeLock(
  api: WakeLockLike | null | undefined,
  hold: boolean,
  current: WakeLockSentinelLike | null,
): Promise<WakeLockSentinelLike | null> {
  if (!hold) {
    if (current && !current.released) {
      try {
        await current.release()
      } catch {
        // already released
      }
    }
    return null
  }
  if (current && !current.released) return current
  if (!api) return null
  try {
    return await api.request("screen")
  } catch {
    return null
  }
}
