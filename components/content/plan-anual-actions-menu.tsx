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
import { nombreCursoPlan, type CursoPlan } from "@/lib/plan-anual"

interface PlanAnualActionsMenuProps {
  curso: CursoPlan
  canEdit: boolean
  onOpen: (curso: CursoPlan) => void
  onMetrics: (curso: CursoPlan) => void
  onEdit: (curso: CursoPlan) => void
  onDelete: (curso: CursoPlan) => void
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
