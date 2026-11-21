import { MAX_LAYERS, type RGB, type Layer, type Bird } from './ink-ridges-math'
import { VERT, FRAG } from './ink-ridges-shader'

const UNIFORMS = ['uResolution', 'uTime', 'uSeed', 'uMist', 'uDrift', 'uGrain', 'uLayers', 'uLayer', 'uPaint', 'uPaintAll', 'uShift', 'uPaper', 'uInk', 'uSunColor', 'uSun', 'uInkScale', 'uClouds', 'uGlow', 'uHorizonY', 'uBirdCount', 'uBird', 'uBirdAlpha', 'uBirdDir', 'uBirdLayer', 'uMoon', 'uSunGrow', 'uDrop'] as const

interface Frame {
  time: number
  seed: number
  mist: number
  drift: number
  grain: number
  layers: Layer[]
  paint: number[]
  paintAll: number
  shift: [number, number]
  paper: RGB
  ink: RGB
  sunColor: RGB
  sun: [number, number, number, number]
  /** Overall ink density: lighter ink on dark paper reads as moonlight, not glare. */
  inkScale: number
  clouds: number
  glow: number
  horizonY: number
  birds: Bird[]
  birdAlpha: number
  birdDir: number
  birdLayer: number
  moon: boolean
  sunGrow: number
  drop: number
}

/** One quad, one program, no textures; renders on demand. */
export class RidgesGL {
  private canvas: HTMLCanvasElement
  private gl: WebGL2RenderingContext | null = null
  private program: WebGLProgram | null = null
  private loc = new Map<string, WebGLUniformLocation | null>()
  private lost = false
  private onRestore: () => void
  ok = false

  constructor(canvas: HTMLCanvasElement, onRestore: () => void) {
    this.canvas = canvas
    this.onRestore = onRestore
    canvas.addEventListener('webglcontextlost', this.handleLost)
    canvas.addEventListener('webglcontextrestored', this.handleRestored)
    this.ok = this.init()
  }

  private handleLost = (e: Event) => {
    e.preventDefault() // required, or the browser never restores it
    this.lost = true
    this.ok = false
  }

  private handleRestored = () => {
    this.lost = false
    this.ok = this.init()
    if (this.ok) this.onRestore()
  }

  private init(): boolean {
    const gl = this.canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'low-power' })
    if (!gl || gl.isContextLost()) return false
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return sh
      console.error('[ink-ridges] shader error', gl.getShaderInfoLog(sh))
      return null
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return false
    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[ink-ridges] link error', gl.getProgramInfoLog(program))
      return false
    }
    gl.useProgram(program)
    gl.bindVertexArray(gl.createVertexArray())
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
    this.loc.clear()
    for (const name of UNIFORMS) this.loc.set(name, gl.getUniformLocation(program, name))
    this.gl = gl
    this.program = program
    return true
  }

  resize(w: number, h: number) {
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
  }

  draw(f: Frame) {
    const gl = this.gl
    if (!gl || !this.program || !this.ok || this.lost) return
    const W = this.canvas.width
    const H = this.canvas.height
    gl.viewport(0, 0, W, H)
    const L = (n: string) => this.loc.get(n)!
    gl.uniform2f(L('uResolution'), W, H)
    gl.uniform1f(L('uTime'), f.time)
    gl.uniform1f(L('uSeed'), f.seed)
    gl.uniform1f(L('uMist'), f.mist)
    gl.uniform1f(L('uDrift'), f.drift)
    gl.uniform1f(L('uGrain'), f.grain)
    gl.uniform1i(L('uLayers'), f.layers.length)
    const layerData = new Float32Array(MAX_LAYERS * 4)
    const paintData = new Float32Array(MAX_LAYERS)
    f.layers.forEach((l, i) => {
      layerData.set([l.base, l.amp, l.freq, l.ink], i * 4)
      paintData[i] = f.paint[i] ?? 1
    })
    gl.uniform4fv(L('uLayer'), layerData)
    gl.uniform1fv(L('uPaint'), paintData)
    gl.uniform1f(L('uPaintAll'), f.paintAll)
    gl.uniform2f(L('uShift'), f.shift[0], f.shift[1])
    gl.uniform3f(L('uPaper'), ...f.paper)
    gl.uniform3f(L('uInk'), ...f.ink)
    gl.uniform3f(L('uSunColor'), ...f.sunColor)
    gl.uniform4f(L('uSun'), ...f.sun)
    gl.uniform1f(L('uInkScale'), f.inkScale)
    gl.uniform1f(L('uClouds'), f.clouds)
    gl.uniform1f(L('uGlow'), f.glow)
    gl.uniform1f(L('uHorizonY'), f.horizonY)
    const birdData = new Float32Array(8 * 4)
    f.birds.slice(0, 8).forEach((b, i) => birdData.set([b.x, b.y, b.size, b.flap], i * 4))
    gl.uniform1i(L('uBirdCount'), Math.min(8, f.birds.length))
    gl.uniform4fv(L('uBird'), birdData)
    gl.uniform1f(L('uBirdAlpha'), f.birdAlpha)
    gl.uniform1f(L('uBirdDir'), f.birdDir)
    gl.uniform1i(L('uBirdLayer'), f.birdLayer)
    gl.uniform1f(L('uMoon'), f.moon ? 1 : 0)
    gl.uniform1f(L('uSunGrow'), f.sunGrow)
    gl.uniform1f(L('uDrop'), f.drop)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  dispose() {
    this.canvas.removeEventListener('webglcontextlost', this.handleLost)
    this.canvas.removeEventListener('webglcontextrestored', this.handleRestored)
    if (this.gl && this.program && !this.lost) this.gl.deleteProgram(this.program)
    this.gl = null
    this.program = null
  }
}

