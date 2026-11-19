"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { KanbanPrioridadFlag, KanbanTipoLabel } from "@/components/content/kanban-meta"
import type { KanbanPlantilla } from "@/lib/kanban"

interface KanbanPlantillasDialogProps {
  plantillas: KanbanPlantilla[]
  onDelete: (plantilla: KanbanPlantilla) => void
  onClose: () => void
}

/** Plantillas del equipo: se crean desde el menú de una tarjeta y aquí solo se consultan o eliminan. */
export function KanbanPlantillasDialog({ plantillas, onDelete, onClose }: KanbanPlantillasDialogProps) {
  const ordenadas = [...plantillas].sort((left, right) => left.nombre.localeCompare(right.nombre, "es"))
  return (
    <ResponsiveShell open onClose={onClose} size="xs" title="Plantillas">
      <ModalHeader title="Plantillas" onClose={onClose} />
      <div className="min-h-0 overflow-y-auto px-4 py-2 sm:px-6">
        {ordenadas.length ? (
          <ul className="divide-y divide-border">
            {ordenadas.map(plantilla => (
              <li key={plantilla.id} className="flex min-h-14 items-center gap-3 py-2">
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <p className="truncate text-label-sm text-foreground">{plantilla.nombre}</p>
                  <div className="flex items-center gap-3">
                    <KanbanTipoLabel tipo={plantilla.tipo} />
                    <KanbanPrioridadFlag prioridad={plantilla.prioridad} />
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Eliminar plantilla ${plantilla.nombre}`} onClick={() => onDelete(plantilla)}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-body-md text-muted-foreground">Guarda una tarjeta como plantilla desde su menú ⋮.</p>
        )}
      </div>
      <ModalFooter onCancel={onClose} cancelLabel="Cerrar" />
    </ResponsiveShell>
  )
}
