import { useState, useEffect } from "react"
import { SEED_TRACKS } from "../data/seedTracks"
import { tourSteps } from "../lib/featureTour"
import { useVaultStore } from "../store/useVaultStore"

const STORAGE_KEY = "dj-vault-tour-v1"

export function FeatureTour() {
  const publishedSeeds = useVaultStore((s) => s.publishedSeeds)
  const seedCount = (publishedSeeds ?? SEED_TRACKS).length
  const steps = tourSteps(seedCount)
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Show tour after a brief delay
        const timer = setTimeout(() => setVisible(true), 2000)
        return () => clearTimeout(timer)
      }
    } catch {
      // private mode - skip tour
    }
  }, [])

  function complete() {
    setVisible(false)
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      // private mode
    }
  }

  function next() {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      complete()
    }
  }

  function prev() {
    if (step > 0) setStep(step - 1)
  }

  function skip() {
    complete()
  }

  if (!visible) return null

  const current = steps[step]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <button
        type="button"
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={skip}
        aria-label="Skip tour"
      />
      <div className="relative z-10 my-auto w-full max-w-lg overflow-hidden rounded-2xl border-2 border-vault-amber/50 bg-vault-surface shadow-2xl">
        <div className="border-b border-vault-border bg-gradient-to-r from-vault-amber/10 to-vault-blue/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-vault-amber">
                Feature Tour
              </p>
              <p className="mt-0.5 text-[10px] text-vault-muted">
                {step + 1} of {steps.length}
              </p>
            </div>
            <button
              type="button"
              onClick={skip}
              className="rounded-lg border border-vault-border px-2.5 py-1 text-xs text-vault-muted hover:text-vault-text"
            >
              Skip
            </button>
          </div>
        </div>

        <div className="p-8 text-center">
          <div className="mb-4 text-6xl">{current.icon}</div>
          <h2 className="mb-3 text-xl font-bold text-vault-text">
            {current.title}
          </h2>
          <p className="text-sm leading-relaxed text-vault-muted">
            {current.description}
          </p>
        </div>

        <div className="border-t border-vault-border bg-vault-elevated/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={prev}
              disabled={step === 0}
              className="rounded-lg border border-vault-border px-4 py-2 text-sm text-vault-muted hover:text-vault-text disabled:opacity-30"
            >
              ← Back
            </button>

            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-8 rounded-full transition ${
                    i === step
                      ? "bg-vault-amber"
                      : i < step
                        ? "bg-vault-amber/50"
                        : "bg-vault-border"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={next}
              className="rounded-lg bg-vault-amber px-4 py-2 text-sm font-medium text-stone-950 hover:bg-amber-400"
            >
              {step === steps.length - 1 ? "Get Started" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
