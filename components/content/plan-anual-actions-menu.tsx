"use client"

import { BarChart3, CalendarClock, EllipsisVertical, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { KanbanCrearDesdeItem } from "@/components/content/kanban-crear-desde"
import { rangoDelMes, type TarjetaDesde } from "@/lib/kanban"
import { MESES, nombreCursoPlan, type CursoPlan } from "@/lib/plan-anual"

interface PlanAnualActionsMenuProps {
  curso: CursoPlan
  canEdit: boolean
  onOpen: (curso: CursoPlan) => void
  onMetrics: (curso: CursoPlan) => void
  onEdit: (curso: CursoPlan) => void
  onDelete: (curso: CursoPlan) => void
}

/** Tarjeta para preparar el curso: vence al final de su mes o en la fecha reprogramada. */
function tarjetaDelCurso(curso: CursoPlan): TarjetaDesde {
  const rango = rangoDelMes(curso.anio, curso.mes)
  return {
    titulo: nombreCursoPlan(curso),
    descripcion: [
      `Plan anual · ${MESES[curso.mes - 1]} ${curso.anio}`,
      `Área que solicita: ${curso.area_solicitante}`,
      `Aplica para: ${curso.aplica_para}`,
    ].join("\n"),
    fecha_inicio: rango.fecha_inicio,
    fecha_limite: curso.reprogramado && curso.fecha_reprogramada ? curso.fecha_reprogramada : rango.fecha_limite,
  }
}

export function PlanAnualActionsMenu({ curso, canEdit, onOpen, onMetrics, onEdit, onDelete }: PlanAnualActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={`Acciones para ${nombreCursoPlan(curso)}`}>
          <EllipsisVertical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onOpen(curso)}>
          <CalendarClock aria-hidden="true" />Seguimiento
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onMetrics(curso)}>
          <BarChart3 aria-hidden="true" />Métricas
        </DropdownMenuItem>
        <KanbanCrearDesdeItem datos={tarjetaDelCurso(curso)} />
        {canEdit && (
          <>
            <DropdownMenuItem onSelect={() => onEdit(curso)}>
              <Pencil aria-hidden="true" />Editar curso
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onDelete(curso)}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive">
              <Trash2 aria-hidden="true" />Eliminar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
