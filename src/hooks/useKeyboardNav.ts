import { useEffect } from "react"
import { useVaultStore } from "../store/useVaultStore"
import { useToastStore } from "../store/useToastStore"

interface KeyboardNavOptions {
  onOpenShortcuts: () => void
  onCloseOverlays: () => void
  shortcutsOpen: boolean
}

/** Global keyboard shortcuts when not typing in an input. */
export function useKeyboardNav(
  visibleIds: string[],
  { onOpenShortcuts, onCloseOverlays, shortcutsOpen }: KeyboardNavOptions,
) {
  useEffect(() => {
    function isTypingTarget(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false
      const tag = el.tagName
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      )
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) {
        if (e.key === "Escape") {
          ;(e.target as HTMLElement).blur()
        }
        return
      }

      if (shortcutsOpen) {
        if (e.key === "Escape" || e.key === "?") {
          e.preventDefault()
          onCloseOverlays()
        }
        return
      }

      const store = useVaultStore.getState()

      switch (e.key) {
        case "/": {
          e.preventDefault()
          document.getElementById("vault-search")?.focus()
          break
        }
        case "j":
        case "ArrowDown": {
          e.preventDefault()
          store.selectRelative(1, visibleIds)
          scrollSelectedIntoView()
          break
        }
        case "k":
        case "ArrowUp": {
          e.preventDefault()
          store.selectRelative(-1, visibleIds)
          scrollSelectedIntoView()
          break
        }
        case "Enter": {
          if (store.selectedId) {
            e.preventDefault()
            store.play(store.selectedId)
          }
          break
        }
        case "u": {
          if (store.selectedId) {
            e.preventDefault()
            store.vote(store.selectedId, 1)
          }
          break
        }
        case "d": {
          if (store.selectedId) {
            e.preventDefault()
            store.vote(store.selectedId, -1)
          }
          break
        }
        case "q": {
          if (store.selectedId) {
            e.preventDefault()
            const id = store.selectedId
            const already = store.queue.includes(id)
            store.enqueue(id)
            if (!already) {
              const t = store.tracks.find((x) => x.id === id)
              useToastStore
                .getState()
                .show(
                  t
                    ? `Queued “${t.title}”`
                    : "Added to queue",
                  "success",
                )
            }
          }
          break
        }
        case "n": {
          e.preventDefault()
          store.playNext()
          break
        }
        case "p": {
          e.preventDefault()
          store.playPrev()
          break
        }
        case "a": {
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            store.setShowAddForm(true)
          }
          break
        }
        case "s": {
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            const id = store.selectedId ?? store.nowPlayingId
            if (!id) break
            store.setSimilarTo(store.similarToId === id ? null : id)
            queueMicrotask(() => {
              document
                .querySelector('[aria-label^="Tracks similar to"]')
                ?.scrollIntoView({ block: "nearest", behavior: "smooth" })
            })
          }
          break
        }
        case "Escape": {
          if (store.similarToId) {
            e.preventDefault()
            store.setSimilarTo(null)
          } else if (store.showAddForm) {
            e.preventDefault()
            store.setShowAddForm(false)
          }
          break
        }
        case "?": {
          e.preventDefault()
          onOpenShortcuts()
          break
        }
      }
    }

    function scrollSelectedIntoView() {
      const id = useVaultStore.getState().selectedId
      if (!id) return
      const nodes = document.querySelectorAll(
        `[data-track-id="${CSS.escape(id)}"]`,
      )
      for (const el of nodes) {
        if (el instanceof HTMLElement && el.getClientRects().length > 0) {
          el.scrollIntoView({ block: "nearest", behavior: "smooth" })
          return
        }
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [visibleIds, onOpenShortcuts, onCloseOverlays, shortcutsOpen])
}
