import { useEffect, useRef } from "react"

interface AudioVisualizerProps {
  /** Whether visualizer should be active */
  active: boolean
  /** Visual style variant */
  variant?: "bars" | "waveform" | "circular"
  /** Color theme */
  theme?: "amber" | "blue" | "rainbow"
}

export function AudioVisualizer({
  active,
  variant = "bars",
  theme = "amber",
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!active || !canvasRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }
    updateSize()

    // YouTube iframe doesn't expose audio context due to CORS
    // Use animated fallback visualization (always in fallback mode for YouTube)

    let time = 0
    const bars = variant === "bars" ? 64 : 32
    const heights = new Array(bars).fill(0).map(() => Math.random() * 0.3 + 0.1)

    const animate = () => {
      const rect = canvas.getBoundingClientRect()
      const { width, height } = rect

      // Clear canvas
      ctx.fillStyle = "rgba(0, 0, 0, 0)"
      ctx.clearRect(0, 0, width, height)

      time += 0.02

      // Simulate audio-reactive bars
      for (let i = 0; i < bars; i++) {
        // Create wave motion
        const phase = (i / bars) * Math.PI * 2 + time
        const wave = Math.sin(phase) * 0.3 + 0.7
        const randomPulse = Math.sin(time * 3 + i) * 0.1
        heights[i] = wave + randomPulse

        // Smooth the values
        heights[i] = Math.max(0.05, Math.min(1, heights[i]))
      }

      if (variant === "bars") {
        drawBars(ctx, width, height, heights, theme)
      } else if (variant === "waveform") {
        drawWaveform(ctx, width, height, heights, theme)
      } else {
        drawCircular(ctx, width, height, heights, theme)
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(canvas)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      resizeObserver.disconnect()
    }
  }, [active, variant, theme])

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full"
      style={{ opacity: active ? 1 : 0 }}
    />
  )
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  heights: number[],
  theme: string,
) {
  const barCount = heights.length
  const barWidth = width / barCount
  const gap = barWidth * 0.2

  for (let i = 0; i < barCount; i++) {
    const barHeight = heights[i] * height * 0.8
    const x = i * barWidth + gap / 2
    const y = height - barHeight

    const gradient = ctx.createLinearGradient(0, y, 0, height)

    if (theme === "amber") {
      gradient.addColorStop(0, "rgba(251, 191, 36, 0.8)")
      gradient.addColorStop(0.5, "rgba(245, 158, 11, 0.6)")
      gradient.addColorStop(1, "rgba(217, 119, 6, 0.4)")
    } else if (theme === "blue") {
      gradient.addColorStop(0, "rgba(56, 189, 248, 0.8)")
      gradient.addColorStop(0.5, "rgba(14, 165, 233, 0.6)")
      gradient.addColorStop(1, "rgba(2, 132, 199, 0.4)")
    } else {
      // Rainbow
      const hue = (i / barCount) * 360
      gradient.addColorStop(0, `hsla(${hue}, 70%, 60%, 0.8)`)
      gradient.addColorStop(1, `hsla(${hue}, 70%, 40%, 0.4)`)
    }

    ctx.fillStyle = gradient
    ctx.fillRect(x, y, barWidth - gap, barHeight)
  }
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  heights: number[],
  theme: string,
) {
  ctx.beginPath()
  ctx.moveTo(0, height / 2)

  const step = width / heights.length

  for (let i = 0; i < heights.length; i++) {
    const x = i * step
    const y = height / 2 + (heights[i] - 0.5) * height * 0.6
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }

  ctx.strokeStyle =
    theme === "amber"
      ? "rgba(251, 191, 36, 0.8)"
      : theme === "blue"
        ? "rgba(56, 189, 248, 0.8)"
        : "rgba(167, 139, 250, 0.8)"
  ctx.lineWidth = 3
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.stroke()

  // Glow effect
  ctx.shadowBlur = 10
  ctx.shadowColor = ctx.strokeStyle
  ctx.stroke()
  ctx.shadowBlur = 0
}

function drawCircular(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  heights: number[],
  theme: string,
) {
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) * 0.3
  const barCount = heights.length

  for (let i = 0; i < barCount; i++) {
    const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2
    const barHeight = heights[i] * radius * 0.8
    const x1 = centerX + Math.cos(angle) * radius
    const y1 = centerY + Math.sin(angle) * radius
    const x2 = centerX + Math.cos(angle) * (radius + barHeight)
    const y2 = centerY + Math.sin(angle) * (radius + barHeight)

    const gradient = ctx.createLinearGradient(x1, y1, x2, y2)

    if (theme === "amber") {
      gradient.addColorStop(0, "rgba(251, 191, 36, 0.3)")
      gradient.addColorStop(1, "rgba(251, 191, 36, 0.9)")
    } else if (theme === "blue") {
      gradient.addColorStop(0, "rgba(56, 189, 248, 0.3)")
      gradient.addColorStop(1, "rgba(56, 189, 248, 0.9)")
    } else {
      const hue = (i / barCount) * 360
      gradient.addColorStop(0, `hsla(${hue}, 70%, 60%, 0.3)`)
      gradient.addColorStop(1, `hsla(${hue}, 70%, 60%, 0.9)`)
    }

    ctx.strokeStyle = gradient
    ctx.lineWidth = Math.max(2, width / barCount * 0.8)
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }
}
