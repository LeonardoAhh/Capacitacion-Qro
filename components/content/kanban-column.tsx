"use client"

import { useState, type ReactNode } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { KanbanCard } from "@/components/content/kanban-card"
import { Skeleton } from "@/components/ui/skeleton"
import type { KanbanEstado, KanbanMiembro, KanbanTarjeta } from "@/lib/kanban"

interface KanbanColumnProps {
  estado: KanbanEstado
  label: string
  tarjetas: KanbanTarjeta[]
  miembros: Map<string, KanbanMiembro>
  onAdd: (estado: KanbanEstado) => void
  onDropCard: (id: string, estado: KanbanEstado) => void
  /** Contenido opcional al pie de la columna (p. ej. "Ver anteriores"). */
  footer?: ReactNode
}

/**
 * Columna vacía: silueta de una tarjeta (misma estructura y medidas) con
 * esqueletos estáticos. El texto "Sin tarjetas" queda para lectores de pantalla.
 */
function KanbanCardPlaceholder() {
  return (
    <div className="grid gap-2 rounded-md border border-dashed border-border p-3">
      <p className="sr-only">Sin tarjetas</p>
      <div aria-hidden="true" className="flex items-center gap-2">
        <Skeleton className="h-3 w-20 animate-none" />
        <Skeleton className="ml-auto size-4 animate-none rounded-sm" />
      </div>
      <Skeleton aria-hidden="true" className="h-4 w-4/5 animate-none" />
      <Skeleton aria-hidden="true" className="h-3 w-3/5 animate-none" />
      <div aria-hidden="true" className="flex items-center gap-2 pt-1">
        <Skeleton className="h-3 w-24 animate-none" />
        <Skeleton className="ml-auto h-3 w-10 animate-none" />
        <Skeleton className="size-6 animate-none rounded-full" />
      </div>
    </div>
  )
}

/** Columna del tablero: encabezado con conteo, lista de tarjetas y zona para soltar. */
export function KanbanColumn({ estado, label, tarjetas, miembros, onAdd, onDropCard, footer }: KanbanColumnProps) {
  const [dragOver, setDragOver] = useState(false)
  const titleId = `kanban-columna-${estado}`

  return (
    <section
      aria-labelledby={titleId}
      onDragOver={event => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        setDragOver(true)
      }}
      onDragLeave={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(false)
      }}
      onDrop={event => {
        event.preventDefault()
        setDragOver(false)
        const id = event.dataTransfer.getData("text/plain")
        if (id) onDropCard(id, estado)
      }}
      // Sin contenedor propio: las tarjetas flotan. Al arrastrar encima se marca la zona con un contorno.
      className={cn(
        "flex min-h-40 min-w-0 flex-col gap-2 rounded-xl outline-2 outline-offset-4 transition-[outline-color]",
        dragOver ? "outline outline-primary" : "outline-transparent",
      )}
    >
      <header className="flex min-h-(--control-height) items-center gap-2 rounded-md border border-border bg-card pl-3 pr-1">
        <h2 id={titleId} className="text-label-sm text-foreground">{label}</h2>
        <span className="text-body-sm tabular-nums text-muted-foreground">
          {tarjetas.length}<span className="sr-only"> {tarjetas.length === 1 ? "tarjeta" : "tarjetas"}</span>
        </span>
        <Button type="button" variant="ghost" size="xs" className="ml-auto px-1" onClick={() => onAdd(estado)}
          aria-label={`Agregar tarjeta en ${label}`}>
          <Plus aria-hidden="true" />
        </Button>
      </header>

      {tarjetas.length ? (
        <ul className="grid gap-2">
          {tarjetas.map(tarjeta => (
            <li key={tarjeta.id}>
              <KanbanCard tarjeta={tarjeta} miembros={miembros} />
            </li>
          ))}
        </ul>
      ) : (
        <KanbanCardPlaceholder />
      )}
      {footer}
    </section>
  )
}
