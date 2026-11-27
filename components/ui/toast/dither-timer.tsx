"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { CELL, celdaVisible, prepararLienzo } from "./dither"

/** Tramo donde la barra se deshace en celdas antes de su borde. */
const BAND = 24

interface DitherTimerProps {
  /** Fracción del tiempo que le queda al toast (1 → 0). */
  restante: () => number
  running: boolean
  toneClass: string
}

/**
 * Barra tramada al pie del toast: se acorta con su tiempo y se detiene mientras la pila está
 * abierta. Solo visual; el tiempo lo lleva la tarjeta.
 */
export function DitherTimer({ restante, running, toneClass }: DitherTimerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0
    const pintar = () => {
      const { ctx, width, height } = prepararLienzo(canvas, canvas)
      if (!ctx) return
      const borde = restante() * width
      for (let x = 0; x < Math.min(width, borde); x += CELL) {
        const densidad = (borde - x) / BAND
        for (let y = 0; y < height; y += CELL) {
          if (celdaVisible(x, y, densidad)) ctx.fillRect(x, y, CELL, CELL)
        }
      }
      if (running) frame = requestAnimationFrame(pintar)
    }
    pintar()
    return () => cancelAnimationFrame(frame)
  }, [restante, running])

  return <canvas ref={canvasRef} aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-1 w-full", toneClass)} />
}
