import { useEffect, useState } from "react"
import { useVaultStore } from "../store/useVaultStore"

const STORAGE_KEY = "dj-vault-welcome-v1"

interface WelcomeBannerProps {
  onOpenShortcuts: () => void
}

export function WelcomeBanner({ onOpenShortcuts }: WelcomeBannerProps) {
  const tracks = useVaultStore((s) => s.tracks)
  const playSet = useVaultStore((s) => s.playSet)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      // private mode
    }
  }

  function playDemoSet() {
    const top = [...tracks]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((t) => t.id)
    // playSet opens Set Mode for multi-track sets automatically.
    if (top.length > 0) playSet(top)
    dismiss()
  }

  if (!visible) return null

  return (
    <div className="border-b border-vault-amber/30 bg-gradient-to-r from-vault-amber/10 via-vault-surface to-vault-blue/10 px-3 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-vault-text">
            Welcome to the vault
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-vault-muted">
            Vote tracks up, build a queue, find similar cuts (vault + YouTube),
            then hit{" "}
            <kbd className="rounded border border-vault-border px-1 font-mono text-[10px]">
              f
            </kbd>{" "}
            for Set Mode — a live fullscreen view. Share sets as links. No
            accounts; everything lives in your browser.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={playDemoSet}
            className="min-h-9 rounded-lg bg-vault-amber px-3 py-1.5 text-xs font-medium text-stone-950 hover:bg-amber-400"
          >
            Play top 5 live set
          </button>
          <button
            type="button"
            onClick={onOpenShortcuts}
            className="min-h-9 rounded-lg border border-vault-border px-3 py-1.5 text-xs text-vault-muted hover:border-vault-amber hover:text-vault-amber"
          >
            Shortcuts{" "}
            <kbd className="ml-0.5 rounded border border-vault-border px-1 font-mono text-[10px]">
              ?
            </kbd>
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="min-h-9 rounded-lg border border-vault-border px-3 py-1.5 text-xs text-vault-muted hover:text-vault-text"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
