"use client"

import { useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { KanbanCard } from "@/components/content/kanban-card"
import type { KanbanEstado, KanbanMiembro, KanbanTarjeta } from "@/lib/kanban"

/** Tarjetas por página en cada columna; cada columna pagina por su cuenta. */
const TARJETAS_POR_PAGINA = 5

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

function KanbanColumnEmpty() {
  return (
    <div className="flex min-h-24 items-center justify-center rounded-md border border-dashed border-border p-4 text-center">
      <p className="text-body-sm text-muted-foreground">Sin tarjetas</p>
    </div>
  )
}

/** Columna del tablero: encabezado con conteo, lista de tarjetas y zona para soltar. */
export function KanbanColumn({ estado, label, tarjetas, miembros, onAdd, onDropCard, footer }: KanbanColumnProps) {
  const [dragOver, setDragOver] = useState(false)
  const [page, setPage] = useState(1)
  const titleId = `kanban-columna-${estado}`
  const totalPages = Math.max(1, Math.ceil(tarjetas.length / TARJETAS_POR_PAGINA))
  const currentPage = Math.min(page, totalPages)
  const visibles = tarjetas.slice((currentPage - 1) * TARJETAS_POR_PAGINA, currentPage * TARJETAS_POR_PAGINA)

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
      {/* Izquierda: título, conteo y agregar. Derecha: páginas de la columna (solo si hay más de una). */}
      <header className="flex min-h-(--control-height) items-center gap-1 rounded-md border border-border bg-card pl-3 pr-1">
        <h2 id={titleId} className="text-label-sm text-foreground">{label}</h2>
        <span className="ml-1 text-body-sm tabular-nums text-muted-foreground">
          {tarjetas.length}<span className="sr-only"> {tarjetas.length === 1 ? "tarjeta" : "tarjetas"}</span>
        </span>
        <Button type="button" variant="ghost" size="xs" className="px-1 text-muted-foreground" onClick={() => onAdd(estado)}
          aria-label={`Agregar tarjeta en ${label}`}>
          <Plus aria-hidden="true" />
        </Button>
        {totalPages > 1 && (
          <nav aria-label={`Páginas de ${label}`} className="ml-auto flex items-center gap-0.5">
            <span className="sr-only" aria-live="polite">Página {currentPage} de {totalPages}</span>
            <Button type="button" variant="ghost" size="xs" className="px-1 text-muted-foreground" disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)} aria-label="Página anterior">
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span aria-hidden="true" className="text-body-sm tabular-nums text-muted-foreground">{currentPage}/{totalPages}</span>
            <Button type="button" variant="ghost" size="xs" className="px-1 text-muted-foreground" disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)} aria-label="Página siguiente">
              <ChevronRight aria-hidden="true" />
            </Button>
          </nav>
        )}
      </header>

      {tarjetas.length ? (
        <ul className="grid gap-2">
          {visibles.map(tarjeta => (
            <li key={tarjeta.id}>
              <KanbanCard tarjeta={tarjeta} miembros={miembros} />
            </li>
          ))}
        </ul>
      ) : (
        <KanbanColumnEmpty />
      )}
      {footer}
    </section>
  )
}
