"use client"

import { useEffect, useState } from "react"
import { watchTheme } from "@/components/ui/radiant-lines"

const CHART_TOKENS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"] as const

function readPalette() {
  const styles = getComputedStyle(document.documentElement)
  return CHART_TOKENS.map(token => `hsl(${styles.getPropertyValue(token).trim()})`)
}

/**
 * Los 5 colores de gráfica (--chart-1…5) como colores CSS listos para un canvas.
 * Se vuelven a leer cuando cambia el tema; antes de montar devuelve undefined.
 */
export function useChartPalette(): string[] | undefined {
  const [palette, setPalette] = useState<string[]>()

  useEffect(() => {
    const update = () => setPalette(previous => {
      const next = readPalette()
      return previous?.join() === next.join() ? previous : next
    })
    update()
    return watchTheme(update)
  }, [])

  return palette
}
