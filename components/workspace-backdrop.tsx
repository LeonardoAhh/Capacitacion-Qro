"use client"

import type { ReactNode } from "react"
import { RadiantLines } from "@/components/ui/radiant-lines"
import { useChartPalette } from "@/components/use-chart-palette"
import { cn } from "@/lib/utils"

/**
 * Fondo de las pantallas fuera del workspace (login, carga y selección de espacio):
 * líneas radiales con los 5 colores de gráfica del tema.
 * `fixed`: para páginas que se desplazan (guía pública). Las líneas se quedan en la
 * ventana y siguen el scroll; sin recorte, para no romper elementos sticky.
 */
export function WorkspaceBackdrop({ children, className, fixed = false }: { children: ReactNode; className?: string; fixed?: boolean }) {
  const palette = useChartPalette()
  return (
    <div className={cn("relative isolate min-h-dvh w-full flex-1 bg-card text-foreground sm:min-h-0", !fixed && "overflow-hidden", className)}>
      <RadiantLines colors={palette} starCount={900} displacement={2.9} className={cn("bg-transparent", fixed && "fixed")} />
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  )
}
