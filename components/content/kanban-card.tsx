"use client"

import { cn } from "@/lib/utils"
import {
  KanbanApoyo, KanbanBloqueo, KanbanFechas, KanbanPersonas, KanbanPrioridadFlag, KanbanResumen, KanbanTarjetaMenu,
  KanbanTipoLabel, useKanbanAcciones,
} from "@/components/content/kanban-meta"
import type { KanbanMiembro, KanbanTarjeta } from "@/lib/kanban"

interface KanbanCardProps {
  tarjeta: KanbanTarjeta
  miembros: Map<string, KanbanMiembro>
}

/** Tarjeta compacta: tipo, título, bloqueo, descripción breve, fechas, avance y personas. Arrastrable entre columnas. */
export function KanbanCard({ tarjeta, miembros }: KanbanCardProps) {
  const { ver, resumenes } = useKanbanAcciones()
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
        <KanbanApoyo tarjeta={tarjeta} />
        <KanbanTarjetaMenu tarjeta={tarjeta} className="-mr-1 -mt-1" />
      </div>

      <button type="button" onClick={() => ver(tarjeta)}
        className={cn(
          "line-clamp-2 break-words rounded-sm text-left text-label-sm",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          concluida ? "text-muted-foreground" : "text-foreground",
        )}>
        {tarjeta.titulo}
      </button>

      {!concluida && <KanbanBloqueo tarjeta={tarjeta} />}

      {tarjeta.descripcion && (
        <p className="line-clamp-2 break-words text-body-sm text-muted-foreground">{tarjeta.descripcion}</p>
      )}

      <div className="flex min-h-6 items-center gap-2">
        <KanbanFechas tarjeta={tarjeta} />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <KanbanResumen resumen={resumenes.get(tarjeta.id)} />
          <KanbanPrioridadFlag prioridad={tarjeta.prioridad} />
          <KanbanPersonas tarjeta={tarjeta} miembros={miembros} />
        </div>
      </div>
    </article>
  )
}
