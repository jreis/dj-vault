import { useToastStore } from "../store/useToastStore"

const toneClass: Record<string, string> = {
  info: "border-vault-blue/40 bg-vault-surface text-vault-blue",
  success: "border-vault-green/40 bg-vault-surface text-vault-green",
  error: "border-vault-red/40 bg-vault-surface text-vault-red",
}

export function Toast() {
  const message = useToastStore((s) => s.message)
  const tone = useToastStore((s) => s.tone)
  const clear = useToastStore((s) => s.clear)

  if (!message) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur-md ${toneClass[tone] ?? toneClass.info}`}
      >
        <p className="min-w-0 flex-1 leading-snug text-vault-text">{message}</p>
        <button
          type="button"
          onClick={clear}
          className="shrink-0 text-vault-muted hover:text-vault-text"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
