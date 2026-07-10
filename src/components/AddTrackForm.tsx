import { useState, type FormEvent } from "react"
import { ERAS, GENRES, type Era, type Genre } from "../types"
import { parseYouTubeId } from "../lib/youtube"
import { useVaultStore } from "../store/useVaultStore"

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

  const [title, setTitle] = useState("")
  const [artist, setArtist] = useState("")
  const [youtube, setYoutube] = useState("")
  const [genre, setGenre] = useState<Genre>("Metal")
  const [era, setEra] = useState<Era>("90s")
  const [year, setYear] = useState(1995)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [eraManual, setEraManual] = useState(false)

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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-vault-amber">Add track</h2>
        <button
          type="button"
          onClick={() => setShowAddForm(false)}
          className="text-xs text-vault-muted hover:text-vault-text"
        >
          Close
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
          <span className="text-xs text-vault-muted">YouTube URL or ID *</span>
          <input
            required
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
            className="rounded-lg border border-vault-border bg-vault-elevated px-3 py-2 text-sm focus:border-vault-amber focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-vault-muted">Title *</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-vault-border bg-vault-elevated px-3 py-2 text-sm focus:border-vault-amber focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-vault-muted">Artist *</span>
          <input
            required
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
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

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-vault-amber px-4 py-2 text-sm font-medium text-stone-950 hover:bg-amber-400"
        >
          Add to vault
        </button>
      </div>
    </form>
  )
}
