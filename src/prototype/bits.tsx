import { useState } from "react"
import { artUrl } from "./room"

export function Art({
  youtubeId,
  alt,
  className,
}: {
  youtubeId: string
  alt: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div
        className={`bg-vault-elevated ${className ?? ""}`}
        role="img"
        aria-label={alt}
      />
    )
  }
  return (
    <img
      src={artUrl(youtubeId)}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}

export function Vote({
  score,
  onUp,
  onDown,
}: {
  score: number
  onUp: () => void
  onDown: () => void
}) {
  return (
    <div className="flex flex-col items-center leading-none">
      <button
        type="button"
        aria-label="Upvote"
        onClick={(event) => {
          event.stopPropagation()
          onUp()
        }}
        className="px-1 text-[10px] text-vault-muted hover:text-vault-green"
      >
        ▲
      </button>
      <span className="text-sm font-medium tabular-nums text-vault-text">{score}</span>
      <button
        type="button"
        aria-label="Downvote"
        onClick={(event) => {
          event.stopPropagation()
          onDown()
        }}
        className="px-1 text-[10px] text-vault-muted hover:text-vault-red"
      >
        ▼
      </button>
    </div>
  )
}
