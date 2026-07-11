import { useVaultStore } from "../store/useVaultStore"

interface HeaderProps {
  trackCount: number
  visibleCount: number
  onOpenShortcuts: () => void
}

export function Header({
  trackCount,
  visibleCount,
  onOpenShortcuts,
}: HeaderProps) {
  const darkMode = useVaultStore((s) => s.darkMode)
  const toggleDarkMode = useVaultStore((s) => s.toggleDarkMode)
  const setShowAddForm = useVaultStore((s) => s.setShowAddForm)
  const showAddForm = useVaultStore((s) => s.showAddForm)

  return (
    <header className="sticky top-0 z-40 border-b border-vault-border bg-vault-surface/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-vault-amber/40 bg-vault-elevated shadow-[0_0_20px_rgba(245,158,11,0.15)] sm:h-10 sm:w-10"
            aria-hidden
          >
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="11" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="16" cy="16" r="3" fill="#f59e0b" />
              <circle
                cx="16"
                cy="16"
                r="7"
                stroke="#f59e0b"
                strokeWidth="1"
                opacity="0.4"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-vault-text sm:text-xl">
              DJ <span className="text-vault-amber">Vault</span>
            </h1>
            <p className="truncate text-[11px] text-vault-muted sm:text-xs">
              <span className="hidden sm:inline">
                Curate sets like shipping systems
                <span className="mx-1.5 text-vault-border">·</span>
              </span>
              {visibleCount === trackCount
                ? `${trackCount} tracks`
                : `${visibleCount} of ${trackCount}`}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onOpenShortcuts}
            className="hidden min-h-9 min-w-9 items-center justify-center rounded-lg border border-vault-border bg-vault-elevated text-sm text-vault-muted transition hover:border-vault-amber/50 hover:text-vault-text sm:inline-flex"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
          >
            ?
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="min-h-9 rounded-lg bg-vault-amber px-2.5 py-1.5 text-sm font-medium text-stone-950 transition hover:bg-amber-400 focus-visible:outline-none sm:px-3"
          >
            {showAddForm ? "Cancel" : "+ Add"}
            <span className="hidden sm:inline"> track</span>
          </button>
          <button
            type="button"
            onClick={toggleDarkMode}
            className="min-h-9 min-w-9 rounded-lg border border-vault-border bg-vault-elevated px-2.5 py-1.5 text-sm text-vault-muted transition hover:border-vault-amber/50 hover:text-vault-text"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={darkMode ? "Light mode" : "Dark mode"}
          >
            {darkMode ? "☀" : "☾"}
          </button>
        </div>
      </div>
    </header>
  )
}
