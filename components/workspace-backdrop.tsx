"use client"

import type { ReactNode } from "react"
import { RadiantLines } from "@/components/ui/radiant-lines"
import { useChartPalette } from "@/components/use-chart-palette"
import { cn } from "@/lib/utils"

/**
 * Fondo de las pantallas fuera del workspace (login, carga y selección de espacio):
 * líneas radiales con los 5 colores de gráfica del tema.
 */
export function WorkspaceBackdrop({ children, className }: { children: ReactNode; className?: string }) {
  const palette = useChartPalette()
  return (
    <div className={cn("relative isolate min-h-dvh w-full flex-1 overflow-hidden bg-card text-foreground sm:min-h-0", className)}>
      <RadiantLines colors={palette} starCount={900} displacement={2.9} className="bg-transparent" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  )
}
