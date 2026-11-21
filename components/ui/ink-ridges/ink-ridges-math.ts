/* ----------------------------- pure parts ------------------------------- */

export type RGB = [number, number, number]
export const MAX_LAYERS = 5
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

export interface Layer {
  /** Ridge-line height, 0 bottom to 1 top. */
  base: number
  /** How far the ridge line rises and falls around its base. */
  amp: number
  /** Horizontal frequency of the peaks. */
  freq: number
  /** Ink density at the ridge line. */
  ink: number
  /** 0 for the farthest ridge, 1 for the nearest. */
  depth: number
}

/** Ridge i of n: the far ridge sits at the horizon; nearer ridges are lower, taller, busier and darker. */
export function layerAt(i: number, n: number, horizon: number): Layer {
  const depth = n <= 1 ? 1 : i / (n - 1)
  const h = Math.min(0.82, Math.max(0.3, horizon))
  return {
    base: n <= 1 ? h : h - (h - 0.2) * depth,
    amp: 0.07 + 0.06 * depth,
    freq: 1.3 + 1.9 * depth,
    ink: 0.22 + 0.5 * depth,
    depth,
  }
}

/** How far ridge i of n has been brushed in at overall progress p. The far ridge starts first. */
export function paintAt(p: number, i: number, n: number): number {
  if (n <= 1) return clamp01(p)
  const stagger = Math.min(0.18, 0.6 / (n - 1))
  const span = 1 - stagger * (n - 1)
  return clamp01((p - i * stagger) / span)
}

/** Ink density for a paper color: full on light paper, eased off on dark paper so light ink reads as moonlight. */
export function inkScaleFor(paper: [number, number, number]): number {
  const lum = 0.2126 * paper[0] + 0.7152 * paper[1] + 0.0722 * paper[2]
  return lum < 0.35 ? 0.62 + (lum / 0.35) * 0.38 : 1
}

/** How far the sun has bloomed at overall progress p: it is the last touch, spreading like a drop of pigment. */
export function sunBloom(p: number): number {
  const t = clamp01((p - 0.55) / 0.4)
  return 1 - (1 - t) ** 3
}

/** Whether to paint the moon: always, never, or ('auto') whenever the paper is dark. */
export function moonFor(moon: boolean | 'auto', paper: [number, number, number]): boolean {
  if (moon !== 'auto') return moon
  return 0.2126 * paper[0] + 0.7152 * paper[1] + 0.0722 * paper[2] < 0.35
}

/**
 * How far the far ridge sinks (uv) once the top of the frame has scrolled `scrolled` px past the
 * viewport top: nearer ridges ride with the page, farther ones lag, and the sun sinks fastest.
 */
export function scrollDrop(scrolled: number, height: number, strength: number): number {
  return clamp01(scrolled / Math.max(1, height)) * Math.max(0, strength)
}

/* The shader's noise, ported so the flock can follow a ridge line exactly. */

function hashU(x: number, y: number): number {
  let n = (Math.imul(x, 1664525) ^ (Math.imul(y, 22695477) + 12345)) >>> 0
  n = (n ^ (n >>> 15)) >>> 0
  n = Math.imul(n, 2246822519) >>> 0
  n = (n ^ (n >>> 13)) >>> 0
  n = Math.imul(n, 3266489917) >>> 0
  n = (n ^ (n >>> 16)) >>> 0
  return n
}
/** Mirrors the GLSL hash2: one value per integer cell, in [0, 1]. */
export function hash2(x: number, y: number): number {
  return hashU(Math.floor(x) + 32768, Math.floor(y) + 32768) / 4294967295
}
const mix = (a: number, b: number, t: number) => a + (b - a) * t
export function vnoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  return mix(mix(hash2(ix, iy), hash2(ix + 1, iy), ux), mix(hash2(ix, iy + 1), hash2(ix + 1, iy + 1), ux), uy)
}
/** Mirrors the GLSL fbm: five octaves, the same rotation and offsets. */
export function fbm(x: number, y: number): number {
  let v = 0
  let a = 0.5
  for (let i = 0; i < 5; i++) {
    v += a * vnoise(x, y)
    const nx = (0.8 * x - 0.6 * y) * 2.03 + 11.7
    const ny = (0.6 * x + 0.8 * y) * 2.03 + 11.7
    x = nx
    y = ny
    a *= 0.5
  }
  return v
}

export interface RidgeOpts {
  n: number
  horizon: number
  seed: number
  aspect: number
  shift: [number, number]
  /** scrollDrop(): how far the far ridge has sunk on scroll. */
  drop?: number
}

/** Height (uv, bottom 0 to top 1) of ridge i's line at uv x, exactly as the shader draws it. */
export function ridgeLineAt(i: number, uvx: number, o: RidgeOpts): number {
  const L = layerAt(i, o.n, o.horizon)
  const k = 0.25 + L.depth
  const x = (uvx + o.shift[0] * k) * o.aspect
  const n = fbm(x * L.freq + o.seed * 1.37 + i * 7.31, i * 3.7 + o.seed * 0.71)
  const ridged = 1 - Math.abs(2 * vnoise(x * L.freq * 2.3 + i * 5.1 + o.seed, i + o.seed * 0.3) - 1)
  const h = L.base + L.amp * ((n - 0.5) * 2 + (ridged - 0.5) * 0.35)
  return h - o.shift[1] * k - (o.drop ?? 0) * (1 - L.depth)
}

export interface Flight {
  /** ms timestamp the flight began (only used by the component). */
  start: number
  /** seconds to cross the frame */
  duration: number
  dir: 1 | -1
  count: number
  /** the ridge the flock follows */
  layer: number
  seed: number
}
export interface Bird {
  x: number
  y: number
  /** half wingspan as a fraction of the frame height */
  size: number
  /** wingtip lift: positive up, negative down */
  flap: number
}

/** The flock t seconds into a flight: a loose V that follows ridge `layer`, flapping and gliding. */
export function birdsAt(f: Flight, t: number, o: RidgeOpts): { alpha: number; birds: Bird[] } {
  const u = clamp01(t / f.duration)
  const lead = f.dir > 0 ? -0.12 + 1.3 * u : 1.12 - 1.3 * u
  const alpha = clamp01(Math.min(u / 0.08, (1 - u) / 0.08, 1))
  const L = layerAt(f.layer, o.n, o.horizon)
  const cruise = L.base + L.amp
  const birds: Bird[] = []
  for (let k = 0; k < f.count; k++) {
    const rank = Math.ceil(k / 2)
    const side = k === 0 ? 0 : k % 2 ? 1 : -1
    const r = hash2(k * 3.1 + f.seed * 7.7, f.seed * 1.3 + k)
    const x = lead - f.dir * rank * (0.028 + 0.008 * r)
    const ridge = ridgeLineAt(f.layer, x, o)
    const bob = 0.005 * Math.sin(t * 1.6 + k * 1.9)
    const y = Math.max(ridge + 0.07, 0.5 * (cruise + ridge) + 0.08) + side * rank * 0.018 + bob
    const glide = 0.5 + 0.5 * Math.sin(t * 0.8 + k * 2.3)
    const flap = (0.15 + 0.4 * glide) * Math.sin(t * (8 + 2 * r) + k * 1.3)
    birds.push({ x, y, size: 0.011 + 0.004 * r, flap })
  }
  return { alpha, birds }
}

/** Exponential smoothing that behaves the same at 60 Hz and 120 Hz. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return target + (current - target) * Math.exp(-lambda * dt)
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const bx = (t: number) => 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t
  const by = (t: number) => 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t
  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0
    let hi = 1
    let t = x
    for (let i = 0; i < 40; i++) {
      t = (lo + hi) / 2
      if (bx(t) < x) lo = t
      else hi = t
    }
    return by(t)
  }
}
export const ink = cubicBezier(0.7, 0, 0.2, 1) // observed · oneshot-sakura.vercel.app

/** #rgb, #rrggbb, rgb(), rgba() → unit floats; null for transparent and for formats that need a browser. */
export function colorToRgb(css: string): RGB | null {
  const s = css.trim()
  let m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (m) {
    const hex = m[1]!.length === 3 ? m[1]!.split('').map((c) => c + c).join('') : m[1]!
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as RGB
  }
  if (/^transparent$/i.test(s)) return null
  m = s.match(/^rgba?\(\s*([\d.]+)\s*,?\s*([\d.]+)\s*,?\s*([\d.]+)\s*(?:[,/]\s*([\d.]+)(%?))?\s*\)/i)
  if (m) {
    if (m[4] !== undefined && Number(m[4]) === 0) return null
    return [+m[1]! / 255, +m[2]! / 255, +m[3]! / 255]
  }
  return null
}

export function resolveCssColor(v: string): RGB | null {
  const direct = colorToRgb(v)
  if (direct) return direct
  if (/^transparent$/i.test(v.trim()) || /^rgba?\([^)]*[,/]\s*0\s*\)$/i.test(v.trim())) return null
  try {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 1
    const ctx = cv.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = getComputedStyle(document.documentElement).color
    ctx.fillStyle = v
    ctx.fillRect(0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    if (d[3] === 0) return null
    return [d[0]! / 255, d[1]! / 255, d[2]! / 255]
  } catch {
    return null
  }
}

/** The element's own color, or for a transparent background the nearest ancestor's, else a default. */
export function resolveColor(el: Element, prop: 'color' | 'backgroundColor'): RGB {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const rgb = resolveCssColor(getComputedStyle(n)[prop])
    if (rgb) return rgb
    if (prop === 'color') break
  }
  return prop === 'color' ? [0.1, 0.1, 0.1] : [1, 1, 1]
}

