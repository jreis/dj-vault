import { useEffect, useRef } from "react"

interface TrackWaveformProps {
  /** Unique identifier for consistent waveform generation */
  trackId: string
  /** Width in pixels */
  width?: number
  /** Height in pixels */
  height?: number
  /** Color theme */
  color?: "amber" | "blue" | "gray"
  /** Show mini version */
  mini?: boolean
}

/**
 * Generates a consistent pseudo-waveform for a track
 * Uses track ID as seed for deterministic generation
 */
export function TrackWaveform({
  trackId,
  width = 200,
  height = 40,
  color = "amber",
  mini = false,
}: TrackWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Generate seeded random numbers based on track ID
    let seed = trackId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Generate waveform data
    const bars = mini ? 40 : 80
    const barWidth = width / bars
    const gap = barWidth * 0.3

    // Create color gradient
    const colors = {
      amber: {
        top: "rgba(251, 191, 36, 0.9)",
        mid: "rgba(245, 158, 11, 0.7)",
        bottom: "rgba(217, 119, 6, 0.5)",
      },
      blue: {
        top: "rgba(56, 189, 248, 0.9)",
        mid: "rgba(14, 165, 233, 0.7)",
        bottom: "rgba(2, 132, 199, 0.5)",
      },
      gray: {
        top: "rgba(161, 161, 170, 0.9)",
        mid: "rgba(113, 113, 122, 0.7)",
        bottom: "rgba(82, 82, 91, 0.5)",
      },
    }

    const palette = colors[color]

    // Draw waveform bars with envelope shape
    for (let i = 0; i < bars; i++) {
      // Create envelope: quieter at start/end, louder in middle
      const normalizedPosition = i / bars
      let envelope = 1

      if (normalizedPosition < 0.15) {
        // Fade in
        envelope = normalizedPosition / 0.15
      } else if (normalizedPosition > 0.85) {
        // Fade out
        envelope = (1 - normalizedPosition) / 0.15
      }

      // Add some randomness for organic feel
      const randomness = seededRandom() * 0.6 + 0.2

      // Create peaks and valleys
      const wave = Math.sin((i / bars) * Math.PI * 4) * 0.3 + 0.7

      const barHeight = height * envelope * randomness * wave
      const x = i * barWidth + gap / 2
      const y = (height - barHeight) / 2

      // Create gradient for this bar
      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight)
      gradient.addColorStop(0, palette.top)
      gradient.addColorStop(0.5, palette.mid)
      gradient.addColorStop(1, palette.bottom)

      ctx.fillStyle = gradient
      ctx.fillRect(x, y, barWidth - gap, barHeight)
    }
  }, [trackId, width, height, color, mini])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded-sm"
    />
  )
}
