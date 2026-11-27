"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { CELL, celdaVisible, prepararLienzo } from "./dither"

/** Ancho de la franja de celdas que va delante del texto. */
const BAND = 28
const CARET = 2
const MS_PER_CHAR = 22

const duracion = (texto: string) => Math.min(700, Math.max(280, texto.length * MS_PER_CHAR))

interface DitherTextProps {
  text: string
  /**
   * true: se escribe a través de las celdas. false: se disuelve en ellas y avisa con
   * `onHidden` (si nunca se mostró, espera oculto sin avisar).
   */
  visible: boolean
  reducedMotion: boolean
  /** Clase de color del tono: tiñe las celdas y el cursor. */
  toneClass: string
  className?: string
  /** Clase del texto (recorte a líneas, por ejemplo). */
  textClassName?: string
  onHidden?: () => void
}

/**
 * Texto que se escribe a través de una franja de celdas tramadas con un cursor en el borde,
 * cambia por las mismas celdas y se disuelve en ellas al salir. El texto completo siempre
 * está en el DOM (lectores de pantalla); el recorte y el lienzo solo son visuales.
 */
export function DitherText({ text, visible, reducedMotion, toneClass, className, textClassName, onHidden }: DitherTextProps) {
  const [mostrado, setMostrado] = useState(text)
  const textRef = useRef<HTMLSpanElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const progresoRef = useRef(reducedMotion ? 1 : 0)
  const seMostroRef = useRef(false)
  const onHiddenRef = useRef(onHidden)
  useEffect(() => { onHiddenRef.current = onHidden })

  const pintar = (progreso: number) => {
    progresoRef.current = progreso
    const textEl = textRef.current
    const canvas = canvasRef.current
    if (!textEl || !canvas) return
    textEl.style.clipPath = progreso >= 1 ? "" : `inset(0 ${(1 - progreso) * 100}% 0 0)`
    const { ctx, width, height } = prepararLienzo(canvas, textEl)
    if (!ctx || progreso >= 1 || progreso <= 0) return
    const borde = progreso * width
    for (let x = Math.floor(borde / CELL) * CELL; x < Math.min(width, borde + BAND); x += CELL) {
      const densidad = 1 - (x - borde) / BAND
      for (let y = 0; y < height; y += CELL) {
        if (celdaVisible(x, y, densidad)) ctx.fillRect(x, y, CELL, CELL)
      }
    }
    ctx.fillRect(Math.max(0, borde - CARET), 0, CARET, height)
  }

  const animar = (hasta: number, ms: number, alTerminar?: () => void) => {
    cancelAnimationFrame(frameRef.current)
    const desde = progresoRef.current
    // Pinta el punto de partida antes del primer cuadro: el texto no se asoma completo.
    pintar(desde)
    const inicio = performance.now()
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / ms)
      pintar(desde + (hasta - desde) * t)
      if (t < 1) frameRef.current = requestAnimationFrame(paso)
      else alTerminar?.()
    }
    frameRef.current = requestAnimationFrame(paso)
  }

  // Entra al mostrarse, cambia de texto pasando por las celdas y se disuelve al ocultarse.
  useLayoutEffect(() => {
    if (!visible && !seMostroRef.current) {
      pintar(0)
      return
    }
    if (visible) seMostroRef.current = true
    if (reducedMotion) {
      cancelAnimationFrame(frameRef.current)
      pintar(visible ? 1 : 0)
      if (!visible) onHiddenRef.current?.()
      return
    }
    if (!visible) {
      animar(0, duracion(mostrado) * 0.6, () => onHiddenRef.current?.())
      return
    }
    if (text === mostrado) {
      if (progresoRef.current < 1) animar(1, duracion(text))
      return
    }
    animar(0, duracion(mostrado) * 0.6, () => setMostrado(text))
    // `mostrado` cambia al terminar la salida: ahí el efecto vuelve a correr y escribe el nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, visible, mostrado, reducedMotion])

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  return (
    // inline-block: mide lo que ocupa el texto, no el ancho de la tarjeta (la franja no recorre vacío).
    <span className={cn("relative inline-block max-w-full align-top", className)}>
      <span ref={textRef} className={cn("block", textClassName)}>{reducedMotion ? text : mostrado}</span>
      <canvas ref={canvasRef} aria-hidden="true" className={cn("pointer-events-none absolute inset-0 size-full", toneClass)} />
    </span>
  )
}
