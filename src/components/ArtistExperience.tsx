import { useMemo } from "react"
import type { ArtistExperience as Experience } from "../lib/artistExperience"
import { useVaultStore } from "../store/useVaultStore"

export function ArtistExperiencePanel({
  experience,
}: {
  experience: Experience
}) {
  const tracks = useVaultStore((s) => s.tracks)
  const play = useVaultStore((s) => s.play)
  const setFilters = useVaultStore((s) => s.setFilters)
  const requestYoutubeSearch = useVaultStore((s) => s.requestYoutubeSearch)

  const inVault = useMemo(
    () =>
      tracks.filter(
        (t) => t.artist.toLowerCase() === experience.name.toLowerCase(),
      ),
    [tracks, experience.name],
  )

  function goToArtist(name: string) {
    setFilters({ query: name })
  }

  return (
    <section
      className="mb-4 overflow-hidden rounded-xl border border-vault-amber/35 bg-vault-surface shadow-lg"
      aria-label={`${experience.name} experience`}
    >
      <div className="bg-gradient-to-br from-vault-amber/15 via-transparent to-vault-elevated/40 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-vault-amber">
              Artist destination
            </p>
            <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight text-vault-text sm:text-3xl">
              {experience.name}
            </h2>
            <p className="mt-1 text-sm text-vault-muted">{experience.tagline}</p>
          </div>
          <button
            type="button"
            onClick={() =>
              requestYoutubeSearch(experience.name, { playBestOf: true })
            }
            className="shrink-0 rounded-lg bg-vault-amber px-3 py-2 text-sm font-medium text-stone-950 hover:brightness-110"
          >
            Play best of {experience.name}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {experience.subgenres.map((g) => (
            <span
              key={`g-${g}`}
              className="rounded-full border border-vault-amber/30 bg-vault-amber/10 px-2 py-0.5 text-[11px] text-vault-amber"
            >
              {g}
            </span>
          ))}
          {experience.vibes.map((v) => (
            <span
              key={`v-${v}`}
              className="rounded-full border border-vault-border bg-vault-elevated px-2 py-0.5 text-[11px] text-vault-muted"
            >
              {v}
            </span>
          ))}
          {experience.peakEra.map((e) => (
            <span
              key={`e-${e}`}
              className="rounded-full border border-vault-border px-2 py-0.5 font-mono text-[11px] text-vault-muted"
            >
              {e}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 border-t border-vault-border px-4 py-4 sm:grid-cols-2 sm:px-5">
        <LineageList
          title="Influences"
          hint="Where the sound comes from"
          artists={experience.influences}
          onPick={goToArtist}
        />
        <LineageList
          title="Kin"
          hint="Neighbors on the same stage"
          artists={experience.kin}
          onPick={goToArtist}
        />
      </div>

      {inVault.length > 0 && (
        <div className="border-t border-vault-border px-4 py-3 sm:px-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-vault-muted">
            In the vault
            <span className="ml-1.5 font-mono text-vault-amber">
              {inVault.length}
            </span>
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {inVault.slice(0, 8).map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => play(t.id)}
                  className="rounded-md border border-vault-border bg-vault-elevated px-2.5 py-1 text-xs text-vault-text hover:border-vault-amber hover:text-vault-amber"
                >
                  {t.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function LineageList({
  title,
  hint,
  artists,
  onPick,
}: {
  title: string
  hint: string
  artists: string[]
  onPick: (name: string) => void
}) {
  if (artists.length === 0) return null
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-vault-text">
        {title}
      </h3>
      <p className="mt-0.5 text-[10px] text-vault-muted/70">{hint}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {artists.map((artist) => (
          <button
            key={artist}
            type="button"
            onClick={() => onPick(artist)}
            className="rounded-md border border-vault-border bg-vault-elevated px-2.5 py-1.5 text-xs text-vault-text transition hover:border-vault-amber hover:bg-vault-amber/10"
          >
            {artist}
          </button>
        ))}
      </div>
    </div>
  )
}
