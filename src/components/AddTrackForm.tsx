import { useMemo, useRef, useState, type FormEvent } from "react"
import { ERAS, GENRES, type Era, type Genre } from "../types"
import { parseYouTubeId, youtubeThumbUrl } from "../lib/youtube"
import { eraFromYear, guessTrackMeta } from "../lib/guessTrackMeta"
import {
  DiscoverError,
  searchYouTubeVideos,
  type DiscoverVideo,
} from "../lib/youtubeDiscover"
import { useVaultStore } from "../store/useVaultStore"
import { useToastStore } from "../store/useToastStore"

type Mode = "search" | "manual"
type SearchStatus = "idle" | "loading" | "ready" | "error"

export function AddTrackForm() {
  const tracks = useVaultStore((s) => s.tracks)
  const addTrack = useVaultStore((s) => s.addTrack)
  const playPreview = useVaultStore((s) => s.playPreview)
  const previewTrack = useVaultStore((s) => s.previewTrack)
  const setShowAddForm = useVaultStore((s) => s.setShowAddForm)
  const showToast = useToastStore((s) => s.show)

  const [mode, setMode] = useState<Mode>("search")

  const [title, setTitle] = useState("")
  const [artist, setArtist] = useState("")
  const [youtube, setYoutube] = useState("")
  const [genre, setGenre] = useState<Genre>("Metal")
  const [era, setEra] = useState<Era>("90s")
  const [year, setYear] = useState<number | "">(1995)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [eraManual, setEraManual] = useState(false)

  const [query, setQuery] = useState(
    () => useVaultStore.getState().filters.query,
  )
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle")
  const [searchResults, setSearchResults] = useState<DiscoverVideo[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchErrorCode, setSearchErrorCode] = useState<string | null>(null)
  const searchSeq = useRef(0)

  const parsedId = useMemo(() => parseYouTubeId(youtube), [youtube])
  const vaultYtIds = useMemo(
    () => new Set(tracks.map((t) => t.youtubeId)),
    [tracks],
  )
  const visibleResults = useMemo(
    () => searchResults.filter((v) => !vaultYtIds.has(v.youtubeId)),
    [searchResults, vaultYtIds],
  )

  function setYearAndMaybeEra(next: number | "") {
    setYear(next)
    if (!eraManual && typeof next === "number" && Number.isFinite(next)) {
      setEra(eraFromYear(next))
    }
  }

  async function runSearch(e?: FormEvent) {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return

    const seq = ++searchSeq.current
    setSearchStatus("loading")
    setSearchError(null)
    setSearchErrorCode(null)

    try {
      const res = await searchYouTubeVideos(q, vaultYtIds)
      if (searchSeq.current !== seq) return
      setSearchResults(res.items)
      setSearchStatus("ready")
    } catch (err) {
      if (searchSeq.current !== seq) return
      if (err instanceof DiscoverError) {
        setSearchError(err.message)
        setSearchErrorCode(err.code)
      } else {
        setSearchError("Could not search YouTube")
        setSearchErrorCode("upstream")
      }
      setSearchStatus("error")
    }
  }

  function selectVideo(video: DiscoverVideo) {
    setYoutube(video.youtubeId)
    const guessed = guessTrackMeta({
      query,
      videoTitle: video.title,
      channelTitle: video.channelTitle,
    })
    setTitle(guessed.title)
    setArtist(guessed.artist)
    setGenre(guessed.genre)
    setYearAndMaybeEra(guessed.year)
  }

  function previewSelected() {
    const youtubeId = parseYouTubeId(youtube)
    if (!youtubeId) return
    const label = title.trim() || "track"
    playPreview({
      youtubeId,
      title: title.trim() || "Untitled",
      artist: artist.trim() || "Unknown",
      genre,
      era,
      year: typeof year === "number" ? year : 1995,
      notes: notes.trim(),
    })
    showToast(`Previewing “${label}” — not in the vault yet`, "info")
    queueMicrotask(() => {
      document
        .querySelector('[aria-label="Player and queue"]')
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    })
  }

  const showManualFallback =
    searchErrorCode === "quota_exceeded" ||
    searchErrorCode === "disabled" ||
    searchErrorCode === "missing_key"

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const youtubeId = parseYouTubeId(youtube)
    if (!youtubeId) {
      setError(
        mode === "search"
          ? "Search and pick a video, or switch to Paste link."
          : "Paste a valid YouTube URL or 11-character video ID.",
      )
      return
    }
    if (!title.trim() || !artist.trim()) {
      setError("Title and artist are required.")
      return
    }
    if (
      typeof year !== "number" ||
      year < 1950 ||
      year > new Date().getFullYear() + 1
    ) {
      setError("Year looks off — check it.")
      return
    }

    addTrack({ title, artist, youtubeId, genre, era, year, notes })
    showToast(`Added “${title.trim()}” to the vault`, "success")
    setTitle("")
    setArtist("")
    setYoutube("")
    setNotes("")
    setEraManual(false)
    setQuery("")
    setSearchResults([])
    setSearchStatus("idle")
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-vault-amber/30 bg-vault-surface p-4 shadow-lg sm:p-5"
    >
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-vault-amber">Add track</h2>
        <button
          type="button"
          onClick={() => setShowAddForm(false)}
          className="text-xs text-vault-muted hover:text-vault-text"
        >
          Close
        </button>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-vault-muted">
        Search YouTube and pick a result, or paste a link directly. Title and
        artist stay editable so the vault stays curated.
      </p>

      <div className="mb-3 inline-flex gap-1 rounded-lg border border-vault-border bg-vault-elevated/50 p-0.5 text-xs">
        <button
          type="button"
          onClick={() => setMode("search")}
          className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
            mode === "search"
              ? "bg-vault-amber text-stone-950"
              : "text-vault-muted hover:text-vault-text"
          }`}
        >
          Search YouTube
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
            mode === "manual"
              ? "bg-vault-amber text-stone-950"
              : "text-vault-muted hover:text-vault-text"
          }`}
        >
          Paste link
        </button>
      </div>

      {mode === "search" && (
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  runSearch()
                }
              }}
              placeholder="John Coltrane Giant Steps"
              className="flex-1 rounded-lg border border-vault-border bg-vault-elevated px-3 py-2 text-sm focus:border-vault-amber focus:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => runSearch()}
              disabled={!query.trim() || searchStatus === "loading"}
              className="shrink-0 rounded-lg border border-vault-border px-3 py-2 text-sm font-medium text-vault-text hover:border-vault-amber disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searchStatus === "loading" ? "Searching…" : "Search"}
            </button>
          </div>

          {searchStatus === "error" && (
            <div className="mt-2 rounded-lg border border-vault-red/30 bg-vault-red/5 px-3 py-2 text-xs text-vault-red">
              <p>{searchError}</p>
              {showManualFallback && (
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className="mt-1 underline underline-offset-2 hover:text-vault-text"
                >
                  Paste a YouTube link instead
                </button>
              )}
            </div>
          )}

          {searchStatus === "ready" && visibleResults.length === 0 && (
            <p className="mt-2 text-xs text-vault-muted">
              No new results. Try a different search, or paste a link
              instead.
            </p>
          )}

          {visibleResults.length > 0 && (
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {visibleResults.map((v) => {
                const isSelected = parsedId === v.youtubeId
                return (
                  <button
                    type="button"
                    key={v.youtubeId}
                    onClick={() => selectVideo(v)}
                    className={`flex items-center gap-2 rounded-lg border p-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "border-vault-amber bg-vault-amber/5"
                        : "border-vault-border hover:border-vault-amber/50"
                    }`}
                  >
                    <img
                      src={v.thumbnailUrl}
                      alt=""
                      className="h-10 w-[4.5rem] shrink-0 rounded object-cover"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-vault-text">
                        {v.title}
                      </span>
                      <span className="block truncate text-vault-muted">
                        {v.channelTitle}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {mode === "manual" && (
        <label className="mb-4 flex flex-col gap-1">
          <span className="text-xs text-vault-muted">YouTube URL or ID *</span>
          <input
            required
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            placeholder="https://youtube.com/watch?v=… or youtu.be/…"
            className="rounded-lg border border-vault-border bg-vault-elevated px-3 py-2 text-sm focus:border-vault-amber focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {youtube && !parsedId && (
            <span className="text-[11px] text-vault-red/90">
              Not a recognized YouTube link yet
            </span>
          )}
        </label>
      )}

      {parsedId && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-vault-border/80 bg-vault-elevated/50 p-2">
          <button
            type="button"
            onClick={previewSelected}
            className="relative h-14 w-[6.25rem] shrink-0 overflow-hidden rounded bg-black"
            title="Preview in player"
            aria-label="Preview this video"
          >
            <img
              src={youtubeThumbUrl(parsedId)}
              alt=""
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-semibold text-white">
              ▶
            </span>
          </button>
          <div className="min-w-0 flex-1 text-xs text-vault-muted">
            <p className="font-medium text-vault-text">
              {previewTrack?.youtubeId === parsedId
                ? "Previewing in the player"
                : "Listen before you add"}
            </p>
            <p className="mt-0.5">
              Preview plays in Now playing — nothing is saved until you add.
            </p>
          </div>
          <button
            type="button"
            onClick={previewSelected}
            className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs ${
              previewTrack?.youtubeId === parsedId
                ? "border-vault-amber bg-vault-amber/15 text-vault-amber"
                : "border-vault-border text-vault-amber hover:border-vault-amber"
            }`}
          >
            Preview
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-vault-muted">Title *</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter Sandman"
            className="rounded-lg border border-vault-border bg-vault-elevated px-3 py-2 text-sm focus:border-vault-amber focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-vault-muted">Artist *</span>
          <input
            required
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Metallica"
            className="rounded-lg border border-vault-border bg-vault-elevated px-3 py-2 text-sm focus:border-vault-amber focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-vault-muted">Genre</span>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value as Genre)}
            className="rounded-lg border border-vault-border bg-vault-elevated px-3 py-2 text-sm focus:border-vault-amber focus:outline-none"
          >
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-vault-muted">Year *</span>
          <input
            type="number"
            required
            min={1950}
            max={new Date().getFullYear() + 1}
            value={year}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === "") {
                setYearAndMaybeEra("")
                return
              }
              const parsed = Number(raw)
              if (!Number.isFinite(parsed)) return
              setYearAndMaybeEra(parsed)
            }}
            className="rounded-lg border border-vault-border bg-vault-elevated px-3 py-2 text-sm focus:border-vault-amber focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-vault-muted">
            Era{" "}
            <span className="font-normal normal-case text-vault-muted/70">
              (auto from year)
            </span>
          </span>
          <select
            value={era}
            onChange={(e) => {
              setEraManual(true)
              setEra(e.target.value as Era)
            }}
            className="rounded-lg border border-vault-border bg-vault-elevated px-3 py-2 text-sm focus:border-vault-amber focus:outline-none"
          >
            {ERAS.map((er) => (
              <option key={er} value={er}>
                {er}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
          <span className="text-xs text-vault-muted">DJ notes</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Set placement, energy, transition ideas…"
            className="rounded-lg border border-vault-border bg-vault-elevated px-3 py-2 text-sm focus:border-vault-amber focus:outline-none"
          />
        </label>
      </div>

      {error && (
        <p className="mt-3 text-sm text-vault-red" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="rounded-lg bg-vault-amber px-4 py-2 text-sm font-medium text-stone-950 hover:bg-amber-400"
        >
          Add to vault
        </button>
        <span className="text-[11px] text-vault-muted">
          Tip: press{" "}
          <kbd className="rounded border border-vault-border px-1 font-mono">
            a
          </kbd>{" "}
          anytime to open this form
        </span>
      </div>
    </form>
  )
}
