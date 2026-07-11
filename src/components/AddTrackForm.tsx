import { useMemo, useState, type FormEvent } from "react"
import { ERAS, GENRES, type Era, type Genre } from "../types"
import { parseYouTubeId, youtubeThumbUrl } from "../lib/youtube"
import { useVaultStore } from "../store/useVaultStore"
import { useToastStore } from "../store/useToastStore"

function eraFromYear(year: number): Era {
  if (year < 1980) return "70s"
  if (year < 1990) return "80s"
  if (year < 2000) return "90s"
  if (year < 2010) return "00s"
  if (year < 2020) return "10s"
  return "20s"
}

export function AddTrackForm() {
  const addTrack = useVaultStore((s) => s.addTrack)
  const setShowAddForm = useVaultStore((s) => s.setShowAddForm)
  const showToast = useToastStore((s) => s.show)

  const [title, setTitle] = useState("")
  const [artist, setArtist] = useState("")
  const [youtube, setYoutube] = useState("")
  const [genre, setGenre] = useState<Genre>("Metal")
  const [era, setEra] = useState<Era>("90s")
  const [year, setYear] = useState(1995)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [eraManual, setEraManual] = useState(false)

  const parsedId = useMemo(() => parseYouTubeId(youtube), [youtube])

  function setYearAndMaybeEra(next: number) {
    setYear(next)
    if (!eraManual && Number.isFinite(next)) {
      setEra(eraFromYear(next))
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const youtubeId = parseYouTubeId(youtube)
    if (!youtubeId) {
      setError("Paste a valid YouTube URL or 11-character video ID.")
      return
    }
    if (!title.trim() || !artist.trim()) {
      setError("Title and artist are required.")
      return
    }
    if (year < 1950 || year > new Date().getFullYear() + 1) {
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
      <p className="mb-4 text-xs leading-relaxed text-vault-muted">
        Find a video on YouTube → copy the link → paste below. Title and artist
        stay in your hands so the vault stays curated.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
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
          {parsedId && (
            <span className="font-mono text-[11px] text-vault-green">
              ID {parsedId}
            </span>
          )}
        </label>

        {parsedId ? (
          <div className="flex items-end sm:col-span-2 lg:col-span-2">
            <div className="flex w-full items-center gap-3 rounded-lg border border-vault-border/80 bg-vault-elevated/50 p-2">
              <div className="relative h-14 w-[6.25rem] shrink-0 overflow-hidden rounded bg-black">
                <img
                  src={youtubeThumbUrl(parsedId)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 text-xs text-vault-muted">
                <p className="font-medium text-vault-text">Preview ready</p>
                <p className="mt-0.5">
                  Fill title & artist, then add. Playback uses this embed.
                </p>
              </div>
            </div>
          </div>
        ) : null}

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
            onChange={(e) => setYearAndMaybeEra(Number(e.target.value))}
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
