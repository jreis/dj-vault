import { useCallback, useEffect, useMemo, useState } from "react"
import { Header } from "./components/Header"
import { FilterBar } from "./components/FilterBar"
import { TrackTable } from "./components/TrackTable"
import { Player } from "./components/Player"
import { AddTrackForm } from "./components/AddTrackForm"
import { Toolbar } from "./components/Toolbar"
import { PlaylistPanel } from "./components/PlaylistPanel"
import { SharedSetBanner } from "./components/SharedSetBanner"
import { SimilarTracks } from "./components/SimilarTracks"
import { WelcomeBanner } from "./components/WelcomeBanner"
import { ShortcutsModal } from "./components/ShortcutsModal"
import { Toast } from "./components/Toast"
import { filterAndSortTracks } from "./lib/filterTracks"
import { fetchShortShare } from "./lib/shareApi"
import {
  clearShareHash,
  readShareFromLocation,
  readShortShareIdFromLocation,
  type ParsedShare,
} from "./lib/shareLink"
import { useVaultStore } from "./store/useVaultStore"
import { useToastStore } from "./store/useToastStore"
import { useKeyboardNav } from "./hooks/useKeyboardNav"

export default function App() {
  const tracks = useVaultStore((s) => s.tracks)
  const filters = useVaultStore((s) => s.filters)
  const showAddForm = useVaultStore((s) => s.showAddForm)
  const loadGuestSet = useVaultStore((s) => s.loadGuestSet)
  const showToast = useToastStore((s) => s.show)

  const [showShortcuts, setShowShortcuts] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [hydrated, setHydrated] = useState(() =>
    useVaultStore.persist.hasHydrated(),
  )

  const openShortcuts = useCallback(() => setShowShortcuts(true), [])
  const closeShortcuts = useCallback(() => setShowShortcuts(false), [])

  // Wait for localStorage rehydrate so a shared set isn't wiped by merge().
  useEffect(() => {
    if (useVaultStore.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    return useVaultStore.persist.onFinishHydration(() => setHydrated(true))
  }, [])

  useEffect(() => {
    if (!hydrated) return
    let cancelled = false

    async function openShared(share: ParsedShare) {
      if (cancelled) return
      loadGuestSet(share.tracks, share.name)
      const label = share.name ? `“${share.name}”` : "shared set"
      showToast(
        `Playing ${label} · ${share.tracks.length} track${share.tracks.length === 1 ? "" : "s"}`,
        "success",
      )
    }

    async function bootShare() {
      const inline = readShareFromLocation()
      if (inline) {
        await openShared(inline)
        return
      }

      const shortId = readShortShareIdFromLocation()
      if (!shortId) return

      setShareLoading(true)
      try {
        const share = await fetchShortShare(shortId)
        if (cancelled) return
        if (!share) {
          showToast("Shared link not found or expired.", "error")
          clearShareHash()
          return
        }
        await openShared(share)
      } finally {
        if (!cancelled) setShareLoading(false)
      }
    }

    void bootShare()
    return () => {
      cancelled = true
    }
  }, [hydrated, loadGuestSet, showToast])

  const visible = useMemo(
    () => filterAndSortTracks(tracks, filters),
    [tracks, filters],
  )
  const visibleIds = useMemo(() => visible.map((t) => t.id), [visible])

  useKeyboardNav(visibleIds, {
    onOpenShortcuts: openShortcuts,
    onCloseOverlays: closeShortcuts,
    shortcutsOpen: showShortcuts,
  })

  return (
    <div className="flex min-h-svh flex-col pb-[env(safe-area-inset-bottom)]">
      <Header
        trackCount={tracks.length}
        visibleCount={visible.length}
        onOpenShortcuts={openShortcuts}
      />

      <WelcomeBanner onOpenShortcuts={openShortcuts} />
      <SharedSetBanner />

      {shareLoading && (
        <div className="border-b border-vault-border bg-vault-surface/80 px-4 py-2 text-center text-xs text-vault-muted">
          Loading shared set…
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-6 sm:py-5">
        <div className="mb-4">
          <Toolbar />
        </div>

        <div className="mb-4">
          <PlaylistPanel />
        </div>

        {showAddForm && (
          <div className="mb-5 animate-fade-in">
            <AddTrackForm />
          </div>
        )}

        <div className="mb-4">
          <FilterBar />
        </div>

        <SimilarTracks />

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
          <span className="text-vault-amber">DJ Vault</span>
          {" · "}
          Curate sets like shipping systems
          {" · "}
          By{" "}
          <a
            href="https://jasonreis.dev"
            className="underline decoration-vault-border underline-offset-2 hover:text-vault-amber"
            target="_blank"
            rel="noreferrer"
          >
            Jason Reis
          </a>
          <span className="hidden sm:inline">
            {" · "}
            Local-first · no accounts
          </span>
          {" · "}
          <button
            type="button"
            onClick={openShortcuts}
            className="underline decoration-vault-border underline-offset-2 hover:text-vault-amber"
          >
            Shortcuts{" "}
            <kbd className="rounded border border-vault-border px-1 font-mono">
              ?
            </kbd>
          </button>
        </p>
      </footer>

      <ShortcutsModal open={showShortcuts} onClose={closeShortcuts} />
      <Toast />
    </div>
  )
}
