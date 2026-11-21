'use client'

/** Ink Ridges by ryanonline1234, adapted for ViñoPlastic. MIT: https://github.com/ryanonline1234/ease-atlas */
import * as React from 'react'
import { cn } from '@/lib/utils'
import { MAX_LAYERS, clamp01, layerAt, paintAt, inkScaleFor, sunBloom, moonFor, scrollDrop, birdsAt, damp, ink, resolveCssColor, resolveColor, type RGB, type Flight, type Bird, type RidgeOpts } from './ink-ridges-math'
import { RidgesGL } from './ink-ridges-renderer'

/* ----------------------------- component -------------------------------- */

const REDUCED = '(prefers-reduced-motion: reduce)'

export interface InkRidgesProps {
  /** Number of ridges, 1–5. */
  layers?: number
  /** Any number; each one paints a different range. */
  seed?: number
  /** Height of the farthest ridge, 0.3–0.82 of the frame. */
  horizon?: number
  /** How much mist lifts out of each foot, 0–1. */
  mist?: number
  /** Mist drift speed; 0 keeps it still (and lets the landscape stop drawing). */
  drift?: number
  /** Pointer parallax strength; 0 turns it off. */
  parallax?: number
  /** Brush-in time in ms; 0 shows the landscape already painted. */
  paintIn?: number
  /** Draw a sun disc behind the far ridge. */
  sun?: boolean
  /** Sun center in the frame, x left→right and y bottom→top, 0–1. */
  sunPosition?: [number, number]
  /** Sun radius as a fraction of the frame height. */
  sunSize?: number
  /** CSS color of the sun. Defaults to the ink color. The moon is always painted in the ink color. */
  sunColor?: string
  /** Paint a pale, mottled moon instead of the sun: always, never, or 'auto' (on dark paper). */
  moon?: boolean | 'auto'
  /** Scroll depth: as the frame scrolls up out of view, far ridges lag and the sun sets. 0 turns it off. */
  scrollDepth?: number
  /** CSS color of the ink. Defaults to the text color. */
  inkColor?: string
  /** Paper grain, 0–1. */
  grain?: number
  /** Brush-streak clouds in the sky, 0–1. */
  clouds?: number
  /** Warm halo around the sun and haze along the horizon, 0–1 (needs the sun). */
  glow?: number
  /** Birds in each passing flock, 0–8; 0 means none. */
  birds?: number
  /** Average seconds between flocks (each gap varies ±40%). */
  birdsEvery?: number
  /** Device-pixel-ratio cap for the canvas. */
  dprCap?: number
  /** An accessible description; without it the landscape is treated as decoration. */
  label?: string
  className?: string
  /** Content laid over the landscape. */
  children?: React.ReactNode
}

export default function InkRidges({
  layers = 4,
  seed = 7,
  horizon = 0.62,
  mist = 0.6,
  drift = 0.05,
  parallax = 0.03,
  paintIn = 2400,
  sun = true,
  sunPosition = [0.78, 0.74],
  sunSize = 0.07,
  sunColor,
  moon = 'auto',
  scrollDepth = 0.35,
  inkColor,
  grain = 0.3,
  clouds = 0.35,
  glow = 0.45,
  birds = 5,
  birdsEvery = 14,
  dprCap = 1.5,
  label,
  className,
  children,
}: InkRidgesProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [glOk, setGlOk] = React.useState(true)
  const opts = React.useRef({ layers, horizon, mist, drift, parallax, paintIn, sun, sunPosition, sunSize, sunColor, moon, scrollDepth, inkColor, grain, seed, clouds, glow, birds, birdsEvery })
  const ctl = React.useRef({ kick: () => {}, repaint: () => {}, retheme: () => {} })

  React.useEffect(() => {
    opts.current = { layers, horizon, mist, drift, parallax, paintIn, sun, sunPosition, sunSize, sunColor, moon, scrollDepth, inkColor, grain, seed, clouds, glow, birds, birdsEvery }
  }, [layers, horizon, mist, drift, parallax, paintIn, sun, sunPosition, sunSize, sunColor, moon, scrollDepth, inkColor, grain, seed, clouds, glow, birds, birdsEvery])

  React.useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    const reducedMq = window.matchMedia(REDUCED)
    let raf = 0
    let last = 0
    let time = 0
    let visible = true
    let paintStart = performance.now()
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 }
    let flight: Flight | null = null
    let nextFlightAt = Infinity
    let flightTimer: ReturnType<typeof setTimeout> | undefined
    const scheduleFlight = (from: number, first: boolean) => {
      const o = opts.current
      if (o.birds <= 0 || reducedMq.matches) {
        nextFlightAt = Infinity
        return
      }
      const every = Math.max(1, o.birdsEvery) * 1000
      nextFlightAt = from + (first ? Math.min(every, Math.max(0, o.paintIn) + 1500) : every * (0.6 + 0.8 * Math.random()))
    }
    scheduleFlight(paintStart, true)
    let paper: RGB = [1, 1, 1]
    let inkRgb: RGB = [0.1, 0.1, 0.1]
    let sunRgb: RGB = [0.1, 0.1, 0.1]
    let night = false

    const theme = () => {
      const o = opts.current
      paper = resolveColor(root, 'backgroundColor')
      inkRgb = (o.inkColor && resolveCssColor(o.inkColor)) || resolveColor(root, 'color')
      night = moonFor(o.moon, paper)
      sunRgb = (!night && o.sunColor && resolveCssColor(o.sunColor)) || inkRgb
    }

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }
    const gl = new RidgesGL(canvas, kick)
    if (!gl.ok) {
      setGlOk(false)
      root.style.setProperty('--ink-ridges-paint', '1')
      return () => gl.dispose()
    }
    theme()

    function frame(now: number) {
      raf = 0
      const o = opts.current
      const reduced = reducedMq.matches
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
      last = now
      const p = reduced || o.paintIn <= 0 ? 1 : clamp01((now - paintStart) / o.paintIn)
      if (reduced) {
        ptr.x = ptr.y = ptr.tx = ptr.ty = 0
      } else {
        time += dt
        ptr.x = damp(ptr.x, ptr.tx, 6, dt)
        ptr.y = damp(ptr.y, ptr.ty, 6, dt)
      }
      const n = Math.max(1, Math.min(MAX_LAYERS, Math.round(o.layers)))
      const ridges = Array.from({ length: n }, (_, i) => layerAt(i, n, o.horizon))
      const aspect = canvas!.width / Math.max(1, canvas!.height)
      const drop = reduced || o.scrollDepth <= 0 ? 0 : scrollDrop(-root!.getBoundingClientRect().top, root!.clientHeight, o.scrollDepth)
      const ridgeOpts: RidgeOpts = { n, horizon: o.horizon, seed: o.seed, aspect, shift: [ptr.x, ptr.y], drop }
      // a flock: start one when it is due (never while hidden, painting or under reduced motion), end it when it has crossed
      if (!flight && !reduced && visible && p >= 1 && o.birds > 0 && now >= nextFlightAt) {
        flight = { start: now, duration: 9 + Math.random() * 3, dir: Math.random() < 0.5 ? 1 : -1, count: Math.min(8, Math.round(o.birds)), layer: n >= 3 ? 1 : 0, seed: Math.floor(Math.random() * 1000) }
      }
      let flock: { alpha: number; birds: Bird[] } = { alpha: 0, birds: [] }
      let flightU = 0
      if (flight) {
        const t = (now - flight.start) / 1000
        if (t >= flight.duration || reduced || o.birds <= 0) {
          flight = null
          scheduleFlight(now, false)
        } else {
          flock = birdsAt(flight, t, ridgeOpts)
          flightU = t / flight.duration
        }
      }
      gl.draw({
        time,
        seed: o.seed,
        mist: clamp01(o.mist),
        drift: reduced ? 0 : Math.max(0, o.drift),
        grain: o.grain,
        layers: ridges,
        paint: ridges.map((_, i) => ink(paintAt(p, i, n))),
        paintAll: p,
        shift: [ptr.x, ptr.y],
        paper,
        ink: inkRgb,
        sunColor: sunRgb,
        sun: [o.sunPosition[0], o.sunPosition[1], o.sunSize, o.sun ? 1 : 0],
        inkScale: inkScaleFor(paper),
        clouds: clamp01(o.clouds),
        glow: clamp01(o.glow),
        horizonY: layerAt(0, n, o.horizon).base,
        birds: flock.birds,
        birdAlpha: flock.alpha,
        birdDir: flight?.dir ?? 1,
        birdLayer: flight ? flight.layer : -1,
        moon: night,
        sunGrow: sunBloom(p),
        drop,
      })
      root!.style.setProperty('--ink-ridges-paint', String(p))
      root!.style.setProperty('--ink-ridges-flight', String(flightU))
      const settling = Math.abs(ptr.x - ptr.tx) > 1e-4 || Math.abs(ptr.y - ptr.ty) > 1e-4
      const moving = p < 1 || o.drift > 0 || settling || !!flight
      clearTimeout(flightTimer)
      if (!reduced && visible && !document.hidden && moving) raf = requestAnimationFrame(frame)
      else {
        last = 0 // the next start takes no time jump
        // idle between flocks: wake once, when the next one is due
        if (!reduced && visible && !document.hidden && Number.isFinite(nextFlightAt)) {
          flightTimer = setTimeout(kick, Math.max(0, nextFlightAt - performance.now()) + 16)
        }
      }
    }

    const resize = new ResizeObserver(([entry]) => {
      const r = entry?.contentRect
      if (!r) return
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap)
      gl.resize(Math.max(1, Math.round(r.width * dpr)), Math.max(1, Math.round(r.height * dpr)))
      kick()
    })
    resize.observe(root)

    const io = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting
      if (visible) kick()
    })
    io.observe(root)

    const onPointer = (e: PointerEvent) => {
      const o = opts.current
      if (reducedMq.matches || o.parallax <= 0 || e.pointerType === 'touch') return
      const r = root.getBoundingClientRect()
      ptr.tx = ((e.clientX - r.left) / r.width - 0.5) * o.parallax
      ptr.ty = -((e.clientY - r.top) / r.height - 0.5) * o.parallax
      kick()
    }
    const onLeave = () => {
      ptr.tx = 0
      ptr.ty = 0
      kick()
    }
    root.addEventListener('pointermove', onPointer)
    root.addEventListener('pointerleave', onLeave)

    // scroll depth: redraw on scroll while the frame is on screen
    const onScroll = () => {
      if (visible && opts.current.scrollDepth > 0 && !reducedMq.matches) kick()
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    const onVisibility = () => kick()
    document.addEventListener('visibilitychange', onVisibility)
    reducedMq.addEventListener('change', onVisibility)
    const onTheme = () => {
      theme()
      kick()
    }
    const mo = new MutationObserver(onTheme)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] })
    const scheme = window.matchMedia('(prefers-color-scheme: dark)')
    scheme.addEventListener('change', onTheme)

    ctl.current = {
      kick,
      repaint: () => {
        paintStart = performance.now()
        flight = null
        scheduleFlight(paintStart, true)
        kick()
      },
      retheme: onTheme,
    }
    kick()

    return () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      clearTimeout(flightTimer)
      ctl.current = { kick: () => {}, repaint: () => {}, retheme: () => {} }
      resize.disconnect()
      io.disconnect()
      mo.disconnect()
      root.removeEventListener('pointermove', onPointer)
      root.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVisibility)
      reducedMq.removeEventListener('change', onVisibility)
      scheme.removeEventListener('change', onTheme)
      gl.dispose()
    }
  }, [dprCap])

  // a new seed paints a new range from the start
  const firstSeed = React.useRef(true)
  React.useEffect(() => {
    if (firstSeed.current) {
      firstSeed.current = false
      return
    }
    ctl.current.repaint()
  }, [seed])

  // any other change redraws once (and keeps drawing only if something now moves)
  React.useEffect(() => {
    ctl.current.kick()
  }, [layers, horizon, mist, drift, parallax, sun, sunPosition, sunSize, grain, clouds, glow, birds, birdsEvery, scrollDepth])
  React.useEffect(() => {
    ctl.current.retheme()
  }, [inkColor, sunColor, moon])

  return (
    <div ref={rootRef} data-ink-ridges="" className={cn('relative isolate overflow-hidden', className)}>
      <canvas
        ref={canvasRef}
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className={cn('absolute inset-0 block h-full w-full', !glOk && 'hidden')}
      />
      {!glOk ? (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 45%, color-mix(in oklab, currentColor 16%, transparent))' }}
        />
      ) : null}
      {children ? <div className="relative z-10 h-full">{children}</div> : null}
    </div>
  )
}
