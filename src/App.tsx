import { useEffect, useMemo, useState } from "react"
import { Header } from "./components/Header"
import { FilterBar } from "./components/FilterBar"
import { TrackTable } from "./components/TrackTable"
import { Player } from "./components/Player"
import { AddTrackForm } from "./components/AddTrackForm"
import { Toolbar } from "./components/Toolbar"
import { filterAndSortTracks } from "./lib/filterTracks"
import {
  clearShareHash,
  readShareFromLocation,
} from "./lib/shareLink"
import { useVaultStore } from "./store/useVaultStore"
import { useKeyboardNav } from "./hooks/useKeyboardNav"
import type { Track } from "./types"

export default function App() {
  const tracks = useVaultStore((s) => s.tracks)
  const filters = useVaultStore((s) => s.filters)
  const showAddForm = useVaultStore((s) => s.showAddForm)
  const importTracks = useVaultStore((s) => s.importTracks)

  const [pendingShare, setPendingShare] = useState<Track[] | null>(null)

  useEffect(() => {
    const shared = readShareFromLocation()
    if (shared) setPendingShare(shared)
  }, [])

  const visible = useMemo(
    () => filterAndSortTracks(tracks, filters),
    [tracks, filters],
  )
  const visibleIds = useMemo(() => visible.map((t) => t.id), [visible])

  useKeyboardNav(visibleIds)

  function acceptShare(mode: "merge" | "replace") {
    if (!pendingShare) return
    importTracks(pendingShare, mode)
    setPendingShare(null)
    clearShareHash()
  }

  function dismissShare() {
    setPendingShare(null)
    clearShareHash()
  }

  return (
    <div className="flex min-h-svh flex-col pb-[env(safe-area-inset-bottom)]">
      <Header trackCount={tracks.length} visibleCount={visible.length} />

      {pendingShare && (
        <div
          className="border-b border-vault-amber/40 bg-vault-amber/10 px-4 py-3 text-sm"
          role="dialog"
          aria-label="Import shared playlist"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-vault-text">
              Shared vault link with{" "}
              <span className="font-mono font-semibold text-vault-amber">
                {pendingShare.length}
              </span>{" "}
              track{pendingShare.length === 1 ? "" : "s"}. Import into your
              library?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => acceptShare("merge")}
                className="rounded-lg bg-vault-amber px-3 py-1.5 text-xs font-medium text-stone-950 hover:bg-amber-400"
              >
                Merge
              </button>
              <button
                type="button"
                onClick={() => acceptShare("replace")}
                className="rounded-lg border border-vault-border px-3 py-1.5 text-xs text-vault-text hover:border-vault-amber"
              >
                Replace library
              </button>
              <button
                type="button"
                onClick={dismissShare}
                className="rounded-lg border border-vault-border px-3 py-1.5 text-xs text-vault-muted hover:text-vault-red"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-6 sm:py-5">
        <div className="mb-4">
          <Toolbar />
        </div>

        {showAddForm && (
          <div className="mb-5">
            <AddTrackForm />
          </div>
        )}

        <div className="mb-4">
          <FilterBar />
        </div>

        {/* Player first on mobile so thumbs can start a set quickly */}
        <div className="grid gap-5 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px]">
          <section
            aria-label="Player and queue"
            className="order-1 lg:order-2 lg:sticky lg:top-20 lg:self-start"
          >
            <Player />
          </section>
          <section aria-label="Track library" className="order-2 lg:order-1">
            <TrackTable tracks={visible} />
          </section>
        </div>
      </main>

      <footer className="border-t border-vault-border px-3 py-4 text-center text-xs text-vault-muted sm:px-6">
        <p className="leading-relaxed">
          <span className="text-vault-amber">Reis DJ Vault</span>
          {" · "}
          Built for{" "}
          <a
            href="https://jasonreis.dev"
            className="underline decoration-vault-border underline-offset-2 hover:text-vault-amber"
            target="_blank"
            rel="noreferrer"
          >
            jasonreis.dev
          </a>
          <span className="hidden sm:inline">
            {" · "}
            Votes & library persist in localStorage
          </span>
          {" · "}
          Press{" "}
          <kbd className="rounded border border-vault-border px-1 font-mono">
            ?
          </kbd>{" "}
          for shortcuts
        </p>
      </footer>
    </div>
  )
}
