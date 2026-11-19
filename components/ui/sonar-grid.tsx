"use client"

import { useEffect, useRef, type HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface SonarGridProps extends HTMLAttributes<HTMLDivElement> {
  reducedMotion?: boolean
  interactive?: boolean
}

interface Ring {
  x: number
  y: number
  born: number
}

const GRID = {
  spacing: 26,
  radius: 1.4,
  opacity: 0.16,
  interval: 2400,
  speed: 260,
  width: 90,
  amplitude: 2.2,
  maxRings: 6,
  maxDpr: 2,
} as const

const TAU = Math.PI * 2

function paint(ctx: CanvasRenderingContext2D, width: number, height: number, rings: Ring[], now: number) {
  const lifetime = (Math.hypot(width, height) + GRID.width) / GRID.speed * 1000
  const active = rings.filter(ring => now - ring.born < lifetime)
  const columns = Math.ceil(width / GRID.spacing) + 1
  const rows = Math.ceil(height / GRID.spacing) + 1
  const offsetX = (width - (columns - 1) * GRID.spacing) / 2
  const offsetY = (height - (rows - 1) * GRID.spacing) / 2

  ctx.clearRect(0, 0, width, height)
  for (let column = 0; column < columns; column++) {
    const x = offsetX + column * GRID.spacing
    for (let row = 0; row < rows; row++) {
      const y = offsetY + row * GRID.spacing
      let energy = 0
      for (const ring of active) {
        const radius = (now - ring.born) / 1000 * GRID.speed
        const distance = Math.abs(Math.hypot(x - ring.x, y - ring.y) - radius)
        if (distance >= GRID.width) continue
        const strength = 1 - distance / GRID.width
        energy = Math.max(energy, strength * strength * (3 - 2 * strength) * (1 - (now - ring.born) / lifetime))
      }
      ctx.globalAlpha = GRID.opacity + (1 - GRID.opacity) * energy
      ctx.beginPath()
      ctx.arc(x, y, GRID.radius * (1 + GRID.amplitude * energy), 0, TAU)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
  return active
}

export function SonarGrid({ reducedMotion = false, interactive = true, className, children, ...props }: SonarGridProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!host || !canvas || !ctx) return

    let width = 0
    let height = 0
    let visible = true
    let raf = 0
    let timer = 0
    let nextPing = performance.now() + GRID.interval
    let rings: Ring[] = []
    let seeded = false
    let color = getComputedStyle(canvas).color

    function draw(now: number) {
      if (!canvas || !ctx) return
      ctx.fillStyle = color
      rings = paint(ctx, width, height, rings, now)
    }

    function tick(now: number) {
      raf = 0
      if (!visible || document.hidden || reducedMotion) return
      if (now >= nextPing) {
        rings.push({ x: width * (0.2 + Math.random() * 0.6), y: height * (0.2 + Math.random() * 0.6), born: now })
        rings = rings.slice(-GRID.maxRings)
        nextPing = now + GRID.interval
      }
      draw(now)
      if (rings.length) raf = requestAnimationFrame(tick)
      else timer = window.setTimeout(wake, Math.max(16, nextPing - now))
    }

    function wake() {
      window.clearTimeout(timer)
      if (!raf && visible && !document.hidden && !reducedMotion) raf = requestAnimationFrame(tick)
    }

    function resize() {
      if (!host || !canvas || !ctx) return
      const rect = host.getBoundingClientRect()
      width = Math.max(1, Math.round(rect.width))
      height = Math.max(1, Math.round(rect.height))
      const dpr = Math.min(window.devicePixelRatio || 1, GRID.maxDpr)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const now = performance.now()
      if (!seeded && !reducedMotion) {
        rings.push({ x: width * 0.68, y: height * 0.34, born: now - 500 })
        seeded = true
      }
      draw(now)
    }

    function onPointerDown(event: PointerEvent) {
      if (!host || !interactive || reducedMotion) return
      const rect = host.getBoundingClientRect()
      rings.push({ x: event.clientX - rect.left, y: event.clientY - rect.top, born: performance.now() })
      rings = rings.slice(-GRID.maxRings)
      wake()
    }

    const resizeObserver = new ResizeObserver(resize)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true
      if (visible) wake()
      else {
        cancelAnimationFrame(raf)
        raf = 0
        window.clearTimeout(timer)
      }
    })
    const themeObserver = new MutationObserver(() => {
      color = getComputedStyle(canvas).color
      draw(performance.now())
    })

    resizeObserver.observe(host)
    intersectionObserver.observe(host)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] })
    host.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("visibilitychange", wake)
    resize()
    wake()

    return () => {
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      themeObserver.disconnect()
      host.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("visibilitychange", wake)
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [interactive, reducedMotion])

  return (
    <div ref={hostRef} className={cn("relative isolate overflow-hidden", className)} {...props}>
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full text-primary" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  )
}
