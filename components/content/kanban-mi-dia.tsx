"use client"

import { Sun, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { KanbanPrioridadFlag, useKanbanAcciones } from "@/components/content/kanban-meta"
import { etiquetaEstado, type KanbanTarjeta } from "@/lib/kanban"

/**
 * Selección personal de hoy: una lista corta encima del tablero. Solo se muestra
 * cuando la persona agregó algo; al día siguiente empieza vacía.
 */
export function KanbanMiDia({ tarjetas }: { tarjetas: KanbanTarjeta[] }) {
  const { editar, alternarMiDia } = useKanbanAcciones()
  if (!tarjetas.length) return null
  const hechas = tarjetas.filter(tarjeta => tarjeta.estado === "concluido").length

  return (
    <section aria-labelledby="kanban-mi-dia" className="rounded-xl border border-border bg-card">
      <header className="flex min-h-11 items-center gap-2 border-b border-border px-3">
        <Sun className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <h2 id="kanban-mi-dia" className="text-label-sm text-foreground">Mi día</h2>
        <span className="ml-auto text-body-sm tabular-nums text-muted-foreground">
          {hechas} de {tarjetas.length}<span className="sr-only"> concluidas</span>
        </span>
      </header>
      <ul className="divide-y divide-border">
        {tarjetas.map(tarjeta => {
          const concluida = tarjeta.estado === "concluido"
          return (
            <li key={tarjeta.id} className="flex min-h-11 items-center gap-3 pl-3 pr-1">
              <button type="button" onClick={() => editar(tarjeta)}
                className={cn(
                  "min-w-0 flex-1 truncate rounded-sm text-left text-body-md",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  concluida ? "text-muted-foreground line-through" : "text-foreground",
                )}>
                {tarjeta.titulo}
              </button>
              <span className="shrink-0 text-body-sm text-muted-foreground max-sm:sr-only">{etiquetaEstado(tarjeta.estado)}</span>
              <KanbanPrioridadFlag prioridad={tarjeta.prioridad} />
              <Button type="button" variant="ghost" size="xs" className="shrink-0 px-1"
                aria-label={`Quitar «${tarjeta.titulo}» de mi día`} onClick={() => alternarMiDia(tarjeta)}>
                <X aria-hidden="true" />
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
