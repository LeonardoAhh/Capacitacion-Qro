"use client"

import { cn } from "@/lib/utils"
import { KanbanAvatar, KanbanFechas, KanbanPrioridadFlag, KanbanTarjetaMenu, KanbanTipoLabel } from "@/components/content/kanban-meta"
import type { KanbanMiembro, KanbanTarjeta } from "@/lib/kanban"

interface KanbanCardProps {
  tarjeta: KanbanTarjeta
  /** Integrante asignado, si existe. */
  responsable: KanbanMiembro | null
  onEdit: (tarjeta: KanbanTarjeta) => void
  onDuplicate: (tarjeta: KanbanTarjeta) => void
  onDelete: (tarjeta: KanbanTarjeta) => void
}

/** Tarjeta compacta: tipo, título, descripción breve y fechas. Arrastrable entre columnas. */
export function KanbanCard({ tarjeta, responsable, onEdit, onDuplicate, onDelete }: KanbanCardProps) {
  const concluida = tarjeta.estado === "concluido"

  return (
    <article
      draggable
      onDragStart={event => {
        event.dataTransfer.setData("text/plain", tarjeta.id)
        event.dataTransfer.effectAllowed = "move"
      }}
      aria-label={tarjeta.titulo}
      className="group relative grid cursor-grab gap-1.5 rounded-md border border-border bg-card p-3 active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 pt-0.5"><KanbanTipoLabel tipo={tarjeta.tipo} /></div>
        <KanbanTarjetaMenu tarjeta={tarjeta} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} className="-mr-1 -mt-1" />
      </div>

      <button type="button" onClick={() => onEdit(tarjeta)}
        className={cn(
          "line-clamp-2 break-words rounded-sm text-left text-label-sm",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          concluida ? "text-muted-foreground" : "text-foreground",
        )}>
        {tarjeta.titulo}
      </button>

      {tarjeta.descripcion && (
        <p className="line-clamp-2 break-words text-body-sm text-muted-foreground">{tarjeta.descripcion}</p>
      )}

      <div className="flex min-h-6 items-center gap-2">
        <KanbanFechas tarjeta={tarjeta} />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <KanbanPrioridadFlag prioridad={tarjeta.prioridad} />
          {responsable && <KanbanAvatar miembro={responsable} />}
        </div>
      </div>
    </article>
  )
}
