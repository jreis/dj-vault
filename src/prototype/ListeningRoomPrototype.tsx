import { useEffect, useMemo, useState } from "react"
import type { Track } from "../types"
import { VariantDeck } from "./VariantDeck"
import { VariantStage } from "./VariantStage"
import { VariantTape } from "./VariantTape"
import {
  VARIANTS,
  byScore,
  cloneSeeds,
  filterTracks,
  findPlaylist,
  readVariant,
  tracksInPlaylist,
  writeVariant,
  type RoomSnapshot,
  type VariantKey,
} from "./room"

export type Room = {
  tracks: Track[]
  visible: Track[]
  nowPlaying: Track | null
  playing: boolean
  queue: Track[]
  selectedId: string | null
  query: string
  playlistId: string | null
  setId: string | null
  searchNonce: number
  setQuery: (query: string) => void
  setPlaylist: (id: string | null) => void
  loadSet: (id: string | null) => void
  play: (id: string) => void
  toggle: () => void
  next: () => void
  prev: () => void
  vote: (id: string, delta: 1 | -1) => void
  toggleQueue: (id: string) => void
  select: (id: string) => void
  startRadio: () => void
  ping: (message: string) => void
}

const seeds = cloneSeeds()
const rankedSeeds = byScore(seeds)

export function ListeningRoomPrototype() {
  const [variant, setVariant] = useState<VariantKey>(readVariant)
  const [tracks, setTracks] = useState<Track[]>(seeds)
  const [nowPlayingId, setNowPlayingId] = useState<string | null>(rankedSeeds[0]?.id ?? null)
  const [queueIds, setQueueIds] = useState<string[]>(rankedSeeds.slice(1, 5).map((track) => track.id))
  const [playing, setPlaying] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(rankedSeeds[0]?.id ?? null)
  const [query, setQuery] = useState("")
  const [playlistId, setPlaylistId] = useState<string | null>(null)
  const [setId, setSetId] = useState<string | null>(null)
  const [searchNonce, setSearchNonce] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [showState, setShowState] = useState(false)

  const visible = useMemo(
    () => filterTracks(tracks, query, playlistId),
    [tracks, query, playlistId],
  )
  const byId = useMemo(() => new Map(tracks.map((track) => [track.id, track])), [tracks])
  const nowPlaying = nowPlayingId ? (byId.get(nowPlayingId) ?? null) : null
  const queue = queueIds.flatMap((id) => {
    const track = byId.get(id)
    return track ? [track] : []
  })

  useEffect(() => {
    writeVariant(variant)
  }, [variant])

  useEffect(() => {
    const node = document.querySelector("[data-room-selected]")
    node?.scrollIntoView({ block: "nearest" })
  }, [selectedId, variant])

  function play(id: string) {
    setNowPlayingId(id)
    setPlaying(true)
    setSelectedId(id)
    setQueueIds((ids) => ids.filter((item) => item !== id))
  }

  function toggle() {
    if (nowPlayingId) {
      setPlaying((value) => !value)
      return
    }
    const first = visible[0]
    if (first) play(first.id)
  }

  function next() {
    if (queueIds.length > 0) {
      const [head, ...rest] = queueIds
      if (!head) return
      setQueueIds(rest)
      setNowPlayingId(head)
      setPlaying(true)
      setSelectedId(head)
      return
    }
    const list = visible.length > 0 ? visible : byScore(tracks)
    if (list.length === 0) return
    const index = list.findIndex((track) => track.id === nowPlayingId)
    const upcoming = list[(index + 1) % list.length]
    if (!upcoming) return
    setNowPlayingId(upcoming.id)
    setPlaying(true)
    setSelectedId(upcoming.id)
  }

  function prev() {
    const list = visible.length > 0 ? visible : byScore(tracks)
    if (list.length === 0) return
    const index = list.findIndex((track) => track.id === nowPlayingId)
    const start = index === -1 ? 0 : index
    const earlier = list[(start - 1 + list.length) % list.length]
    if (!earlier) return
    setNowPlayingId(earlier.id)
    setPlaying(true)
    setSelectedId(earlier.id)
  }

  function vote(id: string, delta: 1 | -1) {
    setTracks((list) =>
      list.map((track) =>
        track.id === id ? { ...track, score: track.score + delta } : track,
      ),
    )
  }

  function toggleQueue(id: string) {
    if (id === nowPlayingId) return
    setQueueIds((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
    )
  }

  function loadSet(id: string | null) {
    const ordered = id ? tracksInPlaylist(tracks, id) : byScore(tracks).slice(0, 5)
    if (ordered.length === 0) {
      setNotice("That set has no songs.")
      return
    }
    const [first, ...rest] = ordered
    if (!first) return
    setSetId(id)
    setNowPlayingId(first.id)
    setQueueIds(rest.map((track) => track.id))
    setPlaying(true)
    setSelectedId(first.id)
    setQuery("")
    setNotice(id ? `Loaded ${findPlaylist(id)?.name ?? "set"}.` : "Loaded the top of the vault.")
  }

  function startRadio() {
    if (!nowPlaying) {
      setNotice("Play a song before starting radio.")
      return
    }
    const more = byScore(tracks)
      .filter(
        (track) =>
          track.genre === nowPlaying.genre &&
          track.id !== nowPlaying.id &&
          !queueIds.includes(track.id),
      )
      .slice(0, 3)
    if (more.length === 0) {
      setNotice(`No more ${nowPlaying.genre} tracks to queue.`)
      return
    }
    setQueueIds((ids) => [...ids, ...more.map((track) => track.id)])
    setNotice(`Radio queued ${more.length} ${nowPlaying.genre} tracks.`)
  }

  const moveIds =
    variant === "tape"
      ? [nowPlayingId, ...queueIds].filter((id): id is string => Boolean(id))
      : visible.map((track) => track.id)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        if (typing) return
        event.preventDefault()
        const index = VARIANTS.findIndex((item) => item.key === variant)
        const step = event.key === "ArrowRight" ? 1 : -1
        const nextVariant = VARIANTS[(index + step + VARIANTS.length) % VARIANTS.length]
        if (nextVariant) setVariant(nextVariant.key)
        return
      }
      if (typing) return
      if (event.key === "/") {
        event.preventDefault()
        setSearchNonce((value) => value + 1)
        return
      }
      if (event.key === " ") {
        event.preventDefault()
        toggle()
        return
      }
      if (event.key === "Enter" && selectedId) {
        event.preventDefault()
        play(selectedId)
        return
      }
      if (event.key === "j" || event.key === "k") {
        if (moveIds.length === 0) return
        event.preventDefault()
        const index = moveIds.indexOf(selectedId ?? "")
        const step = event.key === "j" ? 1 : -1
        const start = index === -1 ? 0 : index
        const upcoming = moveIds[(start + step + moveIds.length) % moveIds.length]
        if (upcoming) setSelectedId(upcoming)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const room: Room = {
    tracks,
    visible,
    nowPlaying,
    playing,
    queue,
    selectedId,
    query,
    playlistId,
    setId,
    searchNonce,
    setQuery,
    setPlaylist: setPlaylistId,
    loadSet,
    play,
    toggle,
    next,
    prev,
    vote,
    toggleQueue,
    select: setSelectedId,
    startRadio,
    ping: setNotice,
  }

  const current = VARIANTS.find((item) => item.key === variant) ?? VARIANTS[0]
  const snapshot: RoomSnapshot = {
    variant,
    playing,
    now: nowPlaying ? `${nowPlaying.artist} — ${nowPlaying.title}` : null,
    queue: queue.map((track) => track.title),
    selected: selectedId ? (byId.get(selectedId)?.title ?? selectedId) : null,
    query,
    playlist: playlistId,
    scores: byScore(tracks)
      .slice(0, 5)
      .map((track) => `${track.score} ${track.title}`),
  }

  const index = VARIANTS.findIndex((item) => item.key === variant)

  return (
    <>
      {variant === "deck" && <VariantDeck room={room} />}
      {variant === "stage" && <VariantStage room={room} />}
      {variant === "tape" && <VariantTape room={room} />}
      <div className="fixed bottom-3 left-1/2 z-[80] flex w-[min(40rem,calc(100%-1.5rem))] -translate-x-1/2 flex-col items-center gap-2">
        {showState && (
          <pre className="max-h-48 w-full overflow-auto rounded-lg bg-white p-3 text-left text-[11px] leading-relaxed text-black shadow-lg">
            {JSON.stringify({ ...snapshot, setId, notice }, null, 2)}
          </pre>
        )}
        <div className="flex items-center gap-1 rounded-full bg-white px-1.5 py-1 text-sm text-black shadow-lg">
          <button
            type="button"
            aria-label="Previous variant"
            onClick={() => {
              const nextVariant = VARIANTS[(index - 1 + VARIANTS.length) % VARIANTS.length]
              if (nextVariant) setVariant(nextVariant.key)
            }}
            className="rounded-full px-2 py-1 hover:bg-neutral-200"
          >
            ←
          </button>
          <span className="px-2 font-medium">
            {current.key} · {current.name}
          </span>
          <button
            type="button"
            aria-label="Next variant"
            onClick={() => {
              const nextVariant = VARIANTS[(index + 1) % VARIANTS.length]
              if (nextVariant) setVariant(nextVariant.key)
            }}
            className="rounded-full px-2 py-1 hover:bg-neutral-200"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => setShowState((value) => !value)}
            className="rounded-full px-2 py-1 text-xs hover:bg-neutral-200"
          >
            state
          </button>
        </div>
        <p className="max-w-lg rounded-full bg-black/80 px-3 py-1 text-center text-[11px] leading-snug text-white">
          {current.line}
          {notice ? ` ${notice}` : " Nothing is saved."}
        </p>
      </div>
    </>
  )
}
