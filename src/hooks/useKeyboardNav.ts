import { useEffect, useRef } from "react"
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
  const countBuf = useRef("")
  const pending = useRef<"" | "g" | "z">("")

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

    function scrollSelectedIntoView(block: ScrollLogicalPosition = "nearest") {
      const id = useVaultStore.getState().selectedId
      if (!id) return
      const nodes = document.querySelectorAll(
        `[data-track-id="${CSS.escape(id)}"]`,
      )
      for (const el of nodes) {
        if (el instanceof HTMLElement && el.getClientRects().length > 0) {
          el.scrollIntoView({ block, behavior: "smooth" })
          return
        }
      }
    }

    function currentIndex(): number {
      const id = useVaultStore.getState().selectedId
      if (!id) return -1
      return visibleIds.indexOf(id)
    }

    function selectAt(i: number) {
      if (visibleIds.length === 0) return
      const idx = Math.max(0, Math.min(visibleIds.length - 1, i))
      useVaultStore.getState().select(visibleIds[idx]!)
      scrollSelectedIntoView()
    }

    function takeCount(): { n: number; explicit: boolean } {
      const raw = countBuf.current
      countBuf.current = ""
      pending.current = ""
      if (!raw) return { n: 1, explicit: false }
      const n = Number.parseInt(raw, 10)
      return {
        n: Number.isFinite(n) && n > 0 ? n : 1,
        explicit: true,
      }
    }

    function pageJump(): number {
      return Math.max(5, Math.ceil(visibleIds.length / 2))
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) {
        countBuf.current = ""
        pending.current = ""
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

      if (store.setMode && e.key === "Escape") {
        e.preventDefault()
        store.setSetMode(false)
        return
      }

      if (
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        e.key >= "0" &&
        e.key <= "9"
      ) {
        if (e.key === "0" && countBuf.current === "") {
          e.preventDefault()
          pending.current = ""
          selectAt(0)
          return
        }
        e.preventDefault()
        countBuf.current = `${countBuf.current}${e.key}`.slice(0, 4)
        pending.current = ""
        return
      }

      const waiting = pending.current
      if (waiting === "g" && e.key !== "g") pending.current = ""
      if (waiting === "z" && e.key !== "z") pending.current = ""

      switch (e.key) {
        case "f":
        case "F": {
          if (!e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault()
            takeCount()
            store.toggleSetMode()
          }
          break
        }
        case "/": {
          e.preventDefault()
          takeCount()
          document.getElementById("vault-search")?.focus()
          break
        }
        case "j":
        case "ArrowDown": {
          if (e.metaKey || e.ctrlKey) break
          e.preventDefault()
          const { n, explicit } = takeCount()
          if (!explicit) {
            store.selectRelative(1, visibleIds)
            scrollSelectedIntoView()
          } else {
            const from = currentIndex() < 0 ? -1 : currentIndex()
            selectAt(from + n)
          }
          break
        }
        case "k":
        case "ArrowUp": {
          if (e.metaKey || e.ctrlKey) break
          e.preventDefault()
          const { n, explicit } = takeCount()
          if (!explicit) {
            store.selectRelative(-1, visibleIds)
            scrollSelectedIntoView()
          } else {
            const from = currentIndex() < 0 ? 0 : currentIndex()
            selectAt(from - n)
          }
          break
        }
        case "g": {
          if (e.metaKey || e.ctrlKey || e.altKey) break
          e.preventDefault()
          if (waiting === "g") {
            const { n, explicit } = takeCount()
            selectAt(explicit ? n - 1 : 0)
          } else {
            pending.current = "g"
          }
          break
        }
        case "G": {
          if (e.metaKey || e.ctrlKey || e.altKey) break
          e.preventDefault()
          const { n, explicit } = takeCount()
          selectAt(explicit ? n - 1 : visibleIds.length - 1)
          break
        }
        case "$":
        case "End": {
          e.preventDefault()
          takeCount()
          selectAt(visibleIds.length - 1)
          break
        }
        case "Home": {
          e.preventDefault()
          takeCount()
          selectAt(0)
          break
        }
        case "d": {
          if (e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            const { n } = takeCount()
            const from = currentIndex() < 0 ? -1 : currentIndex()
            selectAt(from + pageJump() * n)
            break
          }
          if (store.selectedId) {
            e.preventDefault()
            takeCount()
            store.vote(store.selectedId, -1)
          }
          break
        }
        case "u": {
          if (e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            const { n } = takeCount()
            const from = currentIndex() < 0 ? 0 : currentIndex()
            selectAt(from - pageJump() * n)
            break
          }
          if (store.selectedId) {
            e.preventDefault()
            takeCount()
            store.vote(store.selectedId, 1)
          }
          break
        }
        case "PageDown": {
          e.preventDefault()
          const { n } = takeCount()
          const from = currentIndex() < 0 ? -1 : currentIndex()
          selectAt(from + pageJump() * n)
          break
        }
        case "PageUp": {
          e.preventDefault()
          const { n } = takeCount()
          const from = currentIndex() < 0 ? 0 : currentIndex()
          selectAt(from - pageJump() * n)
          break
        }
        case "z": {
          if (e.metaKey || e.ctrlKey) break
          e.preventDefault()
          if (waiting === "z") {
            takeCount()
            scrollSelectedIntoView("center")
          } else {
            pending.current = "z"
          }
          break
        }
        case "Enter": {
          if (store.selectedId) {
            e.preventDefault()
            takeCount()
            store.play(store.selectedId)
          }
          break
        }
        case "q": {
          if (store.selectedId) {
            e.preventDefault()
            takeCount()
            const id = store.selectedId
            const already = store.queue.includes(id)
            store.enqueue(id)
            if (!already) {
              const t = store.tracks.find((x) => x.id === id)
              useToastStore
                .getState()
                .show(t ? `Queued “${t.title}”` : "Added to queue", "success")
            }
          }
          break
        }
        case "n": {
          e.preventDefault()
          takeCount()
          store.playNext()
          break
        }
        case "p": {
          e.preventDefault()
          takeCount()
          store.playPrev()
          break
        }
        case "a": {
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            takeCount()
            store.setShowAddForm(true)
          }
          break
        }
        case "s": {
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            takeCount()
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
          countBuf.current = ""
          pending.current = ""
          if (store.similarToId) {
            e.preventDefault()
            store.setSimilarTo(null)
          } else if (store.youtubeSearchQuery) {
            e.preventDefault()
            store.clearYoutubeSearch()
          } else if (store.showAddForm) {
            e.preventDefault()
            store.setShowAddForm(false)
          } else if (store.setMode) {
            e.preventDefault()
            store.setSetMode(false)
          }
          break
        }
        case "?": {
          e.preventDefault()
          takeCount()
          onOpenShortcuts()
          break
        }
        default:
          countBuf.current = ""
          pending.current = ""
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [visibleIds, onOpenShortcuts, onCloseOverlays, shortcutsOpen])
}
