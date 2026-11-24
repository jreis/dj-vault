import { useCallback, useEffect, useMemo, useState } from "react"
import { Header } from "./components/Header"
import { FilterBar } from "./components/FilterBar"
import { ArtistExperiencePanel } from "./components/ArtistExperience"
import { YoutubeSearchPanel } from "./components/YoutubeSearchPanel"
import { TrackTable } from "./components/TrackTable"
import { Player } from "./components/Player"
import { AddTrackForm } from "./components/AddTrackForm"
import { PlaylistStrip } from "./components/PlaylistStrip"
import { PlaylistSet } from "./components/PlaylistSet"
import { SharedSetBanner } from "./components/SharedSetBanner"
import { SimilarTracks } from "./components/SimilarTracks"
import { RadioMode } from "./components/RadioMode"
import { ShortcutsModal } from "./components/ShortcutsModal"
import { FeatureTour } from "./components/FeatureTour"
import { Toast } from "./components/Toast"
import { MobilePlayerBar } from "./components/MobilePlayerBar"
import { SEED_TRACKS } from "./data/seedTracks"
import { seedsForPlaylist, tracksForPlaylist } from "./lib/playlistPlayback"
import {
  applyArtistTheme,
  resolveArtistExperience,
} from "./lib/artistExperience"
import { filterAndSortTracks, visibleSetSongs } from "./lib/filterTracks"
import { fallbackSelection } from "./lib/trackRow"
import { fetchShortShare } from "./lib/shareApi"
import { fetchPublishedSeeds } from "./lib/seedApi"
import {
  clearShareHash,
  readShareFromLocation,
  readShortShareIdFromLocation,
  type ParsedShare,
} from "./lib/shareLink"
import { useVaultStore } from "./store/useVaultStore"
import { useToastStore } from "./store/useToastStore"
import { useKeyboardNav } from "./hooks/useKeyboardNav"
import { useMobileBarVisible } from "./hooks/useMobileBarVisible"

export default function App() {
  const tracks = useVaultStore((s) => s.tracks)
  const heldTracks = useVaultStore((s) => s.heldTracks)
  const publishedSeeds = useVaultStore((s) => s.publishedSeeds)
  const guestTracks = useVaultStore((s) => s.guestTracks)
  const previewTrack = useVaultStore((s) => s.previewTrack)
  const playlists = useVaultStore((s) => s.playlists)
  const filters = useVaultStore((s) => s.filters)
  const showAddForm = useVaultStore((s) => s.showAddForm)
  const setMode = useVaultStore((s) => s.setMode)
  const loadGuestSet = useVaultStore((s) => s.loadGuestSet)
  const applyPublishedSeeds = useVaultStore((s) => s.applyPublishedSeeds)
  const setSeedPublishConfigured = useVaultStore(
    (s) => s.setSeedPublishConfigured,
  )
  const showToast = useToastStore((s) => s.show)

  const [showShortcuts, setShowShortcuts] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [readingPlaylistId, setReadingPlaylistId] = useState<string | null>(null)
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

  useEffect(() => {
    if (!hydrated) return
    let cancelled = false
    void fetchPublishedSeeds().then((snap) => {
      if (cancelled) return
      setSeedPublishConfigured(snap.publishConfigured)
      applyPublishedSeeds(snap.catalog)
    })
    return () => {
      cancelled = true
    }
  }, [hydrated, applyPublishedSeeds, setSeedPublishConfigured])

  const visible = useMemo(
    () => filterAndSortTracks(tracks, filters),
    [tracks, filters],
  )
  const reading = playlists.find((playlist) => playlist.id === readingPlaylistId)
  const artistExperience = useMemo(
    () => resolveArtistExperience(filters.query),
    [filters.query],
  )
  const readingAll = useMemo(() => {
    if (!reading) return null
    return tracksForPlaylist(reading.trackIds, {
      library: tracks,
      held: heldTracks,
      seeds: seedsForPlaylist(publishedSeeds, SEED_TRACKS),
      guestTracks,
      previewTrack,
    })
  }, [reading, tracks, heldTracks, publishedSeeds, guestTracks, previewTrack])
  const readingSongs = useMemo(
    () => (readingAll ? visibleSetSongs(readingAll, filters) : null),
    [readingAll, filters],
  )
  const showingSet = Boolean(reading) && !artistExperience
  const visibleIds = useMemo(
    () => (showingSet && readingSongs ? readingSongs : visible).map((t) => t.id),
    [showingSet, readingSongs, visible],
  )
  useEffect(() => {
    applyArtistTheme(artistExperience?.theme ?? null, document.documentElement)
    return () => applyArtistTheme(null, document.documentElement)
  }, [artistExperience])

  // After load (and when filters hide the current row), keep a row
  // selected. The playing song wins over the first visible row, so the
  // cursor does not land on a different track than the one you hear.
  useEffect(() => {
    if (!hydrated || visibleIds.length === 0) return
    const { selectedId, nowPlayingId } = useVaultStore.getState()
    const next = fallbackSelection(selectedId, nowPlayingId, visibleIds)
    if (next && next !== selectedId) {
      useVaultStore.getState().select(next)
    }
  }, [hydrated, visibleIds])

  const mobileBarVisible = useMobileBarVisible()

  useKeyboardNav(visibleIds, {
    onOpenShortcuts: openShortcuts,
    onCloseOverlays: closeShortcuts,
    shortcutsOpen: showShortcuts,
  })

  return (
    <div
      className={`flex min-h-svh flex-col ${
        mobileBarVisible
          ? "pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-[env(safe-area-inset-bottom)]"
          : "pb-[env(safe-area-inset-bottom)]"
      }`}
    >
      <Header
        trackCount={tracks.length}
        visibleCount={showingSet ? tracks.length : visible.length}
        onOpenShortcuts={openShortcuts}
      />

      <SharedSetBanner />

      {shareLoading && (
        <div className="border-b border-vault-border bg-vault-surface/80 px-4 py-2 text-center text-xs text-vault-muted">
          Loading shared set…
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-3 sm:px-5 sm:py-4">
        {showAddForm && (
          <div className="mb-4 animate-fade-in">
            <AddTrackForm />
          </div>
        )}

        {artistExperience && (
          <ArtistExperiencePanel experience={artistExperience} />
        )}

        <YoutubeSearchPanel />
        <SimilarTracks />

        {/* Player first on mobile so thumbs can start a set quickly */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <section
            aria-label="Player and queue"
            className={`order-1 min-w-0 space-y-3 lg:order-2 lg:self-start ${
              // Sticky traps Set Mode's fixed layer under the header.
              setMode ? "" : "lg:sticky lg:top-20"
            }`}
          >
            <Player />
            {!artistExperience && <RadioMode />}
          </section>
          <section
            aria-label={reading ? reading.name : "Track library"}
            className="order-2 min-w-0 lg:order-1"
          >
            {!artistExperience && (
              <PlaylistStrip
                selectedId={reading?.id ?? null}
                onSelect={setReadingPlaylistId}
              />
            )}
            <div className="mb-3">
              <FilterBar scope={showingSet ? readingAll : null} />
            </div>
            {reading && !artistExperience ? (
              <PlaylistSet playlist={reading} />
            ) : (
              <TrackTable tracks={visible} />
            )}
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
      <FeatureTour />
      <MobilePlayerBar />
      <Toast />
    </div>
  )
}
