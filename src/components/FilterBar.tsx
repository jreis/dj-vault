import { useMemo } from "react"
import { ERAS, GENRES, type SortKey } from "../types"
import {
  filterAndSortTracks,
  genreCounts,
  hasActiveFilters,
} from "../lib/filterTracks"
import { useVaultStore } from "../store/useVaultStore"

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "score", label: "Score" },
  { value: "title", label: "Title" },
  { value: "artist", label: "Artist" },
  { value: "year", label: "Year" },
  { value: "genre", label: "Genre" },
  { value: "addedAt", label: "Added" },
]

export function FilterBar() {
  const tracks = useVaultStore((s) => s.tracks)
  const filters = useVaultStore((s) => s.filters)
  const setFilters = useVaultStore((s) => s.setFilters)
  const clearFilters = useVaultStore((s) => s.clearFilters)
  const enqueueMany = useVaultStore((s) => s.enqueueMany)
  const playSet = useVaultStore((s) => s.playSet)

  const counts = useMemo(
    () => genreCounts(tracks, { query: filters.query, era: filters.era }),
    [tracks, filters.query, filters.era],
  )

  const active = hasActiveFilters(filters)

  const matchingIds = useMemo(
    () => filterAndSortTracks(tracks, filters).map((t) => t.id),
    [tracks, filters],
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-[14rem]">
          <span className="text-xs font-medium uppercase tracking-wide text-vault-muted">
            Search{" "}
            <kbd className="ml-1 rounded border border-vault-border px-1 font-mono text-[10px] normal-case">
              /
            </kbd>
          </span>
          <div className="relative">
            <input
              id="vault-search"
              type="search"
              placeholder="Title, artist, year, notes…"
              value={filters.query}
              onChange={(e) => setFilters({ query: e.target.value })}
              className="w-full rounded-lg border border-vault-border bg-vault-elevated py-2 pl-3 pr-9 text-sm text-vault-text placeholder:text-vault-muted/60 focus:border-vault-amber focus:outline-none"
            />
            {filters.query && (
              <button
                type="button"
                onClick={() => setFilters({ query: "" })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-vault-muted hover:text-vault-text"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-vault-muted">
            Era
          </span>
          <select
            value={filters.era}
            onChange={(e) =>
              setFilters({ era: e.target.value as typeof filters.era })
            }
            className="rounded-lg border border-vault-border bg-vault-elevated px-3 py-2 text-sm text-vault-text focus:border-vault-amber focus:outline-none"
          >
            <option value="All">All eras</option>
            {ERAS.map((era) => (
              <option key={era} value={era}>
                {era}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-vault-muted">
            Sort
          </span>
          <div className="flex gap-1">
            <select
              value={filters.sortKey}
              onChange={(e) =>
                setFilters({ sortKey: e.target.value as SortKey })
              }
              className="rounded-lg border border-vault-border bg-vault-elevated px-3 py-2 text-sm text-vault-text focus:border-vault-amber focus:outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                setFilters({
                  sortDir: filters.sortDir === "asc" ? "desc" : "asc",
                })
              }
              className="rounded-lg border border-vault-border bg-vault-elevated px-2.5 py-2 text-sm text-vault-muted hover:text-vault-amber"
              title={filters.sortDir === "asc" ? "Ascending" : "Descending"}
              aria-label={`Sort ${filters.sortDir === "asc" ? "ascending" : "descending"}`}
            >
              {filters.sortDir === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </label>

        {active && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-vault-border px-3 py-2 text-sm text-vault-muted hover:border-vault-red hover:text-vault-red sm:self-end"
          >
            Clear filters
          </button>
        )}
      </div>

      <div
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
        role="group"
        aria-label="Filter by genre"
      >
        <GenreChip
          label="All"
          count={counts.get("All") ?? 0}
          active={filters.genre === "All"}
          onClick={() => setFilters({ genre: "All" })}
        />
        {GENRES.map((g) => {
          const n = counts.get(g) ?? 0
          if (n === 0 && filters.genre !== g) return null
          return (
            <GenreChip
              key={g}
              label={g}
              count={n}
              active={filters.genre === g}
              onClick={() =>
                setFilters({ genre: filters.genre === g ? "All" : g })
              }
            />
          )
        })}
      </div>

      {matchingIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-vault-muted">
            <span className="font-mono text-vault-amber">
              {matchingIds.length}
            </span>{" "}
            matching
          </span>
          <button
            type="button"
            onClick={() => playSet(matchingIds)}
            className="rounded-md border border-vault-border px-2 py-1 text-vault-muted hover:border-vault-amber hover:text-vault-amber"
          >
            Play filtered set
          </button>
          <button
            type="button"
            onClick={() => enqueueMany(matchingIds)}
            className="rounded-md border border-vault-border px-2 py-1 text-vault-muted hover:border-vault-blue hover:text-vault-blue"
          >
            Queue all matching
          </button>
        </div>
      )}
    </div>
  )
}

function GenreChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs transition ${
        active
          ? "border-vault-amber bg-vault-amber/15 font-medium text-vault-amber"
          : "border-vault-border bg-vault-elevated text-vault-muted hover:border-vault-amber/40 hover:text-vault-text"
      }`}
    >
      {label}
      <span
        className={`ml-1.5 font-mono tabular-nums ${
          active ? "text-vault-amber" : "text-vault-muted/70"
        }`}
      >
        {count}
      </span>
    </button>
  )
}
