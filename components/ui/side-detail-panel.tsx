"use client"

import type { ReactNode } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ResponsiveShell } from "@/components/ui/responsive-shell"

/** Igual al breakpoint `lg`: desde aquí el detalle va a un lado de la lista. */
export const DETAIL_SIDE_QUERY = "(min-width: 64rem)"

/** Columnas de la vista lista + detalle; el panel crece con la pantalla. */
export const LIST_WITH_DETAIL_GRID = "grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_28rem] 2xl:grid-cols-[minmax(0,1fr)_32rem]"

/**
 * Detalle del elemento elegido en una lista. Desde `lg` es una columna fija junto a la
 * lista (con su propio scroll); en móvil, una hoja inferior, y en tablet, un modal
 * centrado. Ambos toman el alto del contenido (con tope y scroll). Cerrar flota
 * arriba a la derecha para que el contenido encabece el panel.
 */
export function SideDetailPanel({ side, title, description, onClose, children }: {
  side: boolean
  /** Nombre del panel para lectores de pantalla. */
  title: string
  description: string
  onClose: () => void
  children: ReactNode
}) {
  const body = (
    <div className="relative flex min-h-0 flex-col">
      <Button type="button" variant="ghost" size="icon" aria-label="Cerrar detalle" onClick={onClose} className="absolute right-2 top-2 z-10">
        <X aria-hidden="true" />
      </Button>
      <div className="min-h-0 overflow-y-auto overscroll-contain">{children}</div>
    </div>
  )

  if (side) {
    return (
      <aside aria-label={`Detalle: ${title}`}
        className="sticky top-0 flex max-h-[calc(100dvh-var(--workspace-header-height)-2*var(--workspace-inset)-2*var(--workspace-content-padding-y))] min-w-0 flex-col self-start overflow-hidden rounded-xl border border-border bg-card">
        {body}
      </aside>
    )
  }

  return (
    <ResponsiveShell open onClose={onClose} size="sm" title={title} description={description}>
      {body}
    </ResponsiveShell>
  )
}
