interface ShortcutsModalProps {
  open: boolean
  onClose: () => void
}

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "/", action: "Focus search" },
  { keys: "j / k  or  ↓ / ↑", action: "Move selection" },
  { keys: "Enter", action: "Play selected track" },
  { keys: "u / d", action: "Upvote / downvote" },
  { keys: "q", action: "Add selected to queue" },
  { keys: "s", action: "Similar tracks (selected or playing)" },
  { keys: "n / p", action: "Next / previous track" },
  { keys: "f", action: "Toggle set mode (live fullscreen)" },
  { keys: "a", action: "Open add-track form" },
  { keys: "Esc", action: "Exit set mode / close panels / blur" },
  { keys: "?", action: "This help" },
]

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close shortcuts"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-vault-border bg-vault-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-vault-border px-4 py-3">
          <h2
            id="shortcuts-title"
            className="text-sm font-semibold text-vault-amber"
          >
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-vault-border px-2 py-1 text-xs text-vault-muted hover:text-vault-text"
          >
            Esc
          </button>
        </div>
        <ul className="max-h-[min(70vh,28rem)] divide-y divide-vault-border/60 overflow-y-auto px-1 py-1">
          {SHORTCUTS.map((row) => (
            <li
              key={row.keys}
              className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm"
            >
              <span className="text-vault-muted">{row.action}</span>
              <kbd className="shrink-0 rounded-md border border-vault-border bg-vault-elevated px-2 py-1 font-mono text-[11px] text-vault-text">
                {row.keys}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="border-t border-vault-border px-4 py-3 text-[11px] leading-relaxed text-vault-muted">
          Shortcuts are off while typing in a field. Press{" "}
          <kbd className="rounded border border-vault-border px-1 font-mono">
            Esc
          </kbd>{" "}
          to blur, then navigate with{" "}
          <kbd className="rounded border border-vault-border px-1 font-mono">
            j
          </kbd>
          /
          <kbd className="rounded border border-vault-border px-1 font-mono">
            k
          </kbd>
          .
        </p>
      </div>
    </div>
  )
}
