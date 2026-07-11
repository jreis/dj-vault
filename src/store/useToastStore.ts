import { create } from "zustand"

export type ToastTone = "info" | "success" | "error"

interface ToastState {
  message: string | null
  tone: ToastTone
  show: (message: string, tone?: ToastTone) => void
  clear: () => void
}

let clearTimer: ReturnType<typeof setTimeout> | null = null

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  tone: "info",
  show: (message, tone = "info") => {
    if (clearTimer) clearTimeout(clearTimer)
    set({ message, tone })
    clearTimer = setTimeout(() => {
      set({ message: null })
      clearTimer = null
    }, 3200)
  },
  clear: () => {
    if (clearTimer) clearTimeout(clearTimer)
    clearTimer = null
    set({ message: null })
  },
}))
