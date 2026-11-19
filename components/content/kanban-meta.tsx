"use client"

import { BellRing, CalendarDays, Copy, EllipsisVertical, Flag, ListTodo, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  estaVencida, etiquetaPrioridad, etiquetaTipo, formatRango, iniciales,
  type KanbanMiembro, type KanbanPrioridad, type KanbanTarjeta, type KanbanTipo,
} from "@/lib/kanban"

/** Piezas compartidas por la vista de tablero y la de lista. */

// Solo la bandera lleva color; el texto de la prioridad la acompaña en tono neutro.
const COLOR_PRIORIDAD: Record<KanbanPrioridad, string> = {
  alta: "text-destructive",
  media: "text-warning",
  baja: "text-success",
}

const TIPO_ICON: Record<KanbanTipo, typeof ListTodo> = {
  actividad: ListTodo,
  recordatorio: BellRing,
}

export function KanbanTipoLabel({ tipo }: { tipo: KanbanTipo }) {
  const Icon = TIPO_ICON[tipo]
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-body-sm text-muted-foreground">
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {etiquetaTipo(tipo)}
    </span>
  )
}

export function KanbanPrioridadFlag({ prioridad }: { prioridad: KanbanPrioridad }) {
  return (
    <span className="flex items-center gap-1 text-body-sm text-muted-foreground">
      <Flag className={cn("size-3.5 shrink-0 fill-current", COLOR_PRIORIDAD[prioridad])} aria-hidden="true" />
      <span className="sr-only">Prioridad </span>{etiquetaPrioridad(prioridad)}
    </span>
  )
}

/** Fechas de la tarjeta; vencida en rojo y con texto, para no depender solo del color. */
export function KanbanFechas({ tarjeta }: { tarjeta: KanbanTarjeta }) {
  const rango = formatRango(tarjeta.fecha_inicio, tarjeta.fecha_limite)
  if (!rango) return null
  const vencida = estaVencida(tarjeta)
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5 text-body-sm tabular-nums",
      vencida ? "font-medium text-destructive" : "text-muted-foreground")}>
      <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{vencida && "Vencida · "}{rango}</span>
    </span>
  )
}

/** Iniciales del responsable; el nombre completo queda en title y para lectores de pantalla. */
export function KanbanAvatar({ miembro }: { miembro: KanbanMiembro }) {
  return (
    <span title={miembro.nombre}
      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-eyebrow text-secondary-foreground">
      <span aria-hidden="true">{iniciales(miembro.nombre)}</span>
      <span className="sr-only">Responsable: {miembro.nombre}</span>
    </span>
  )
}

interface KanbanTarjetaMenuProps {
  tarjeta: KanbanTarjeta
  onEdit: (tarjeta: KanbanTarjeta) => void
  onDuplicate: (tarjeta: KanbanTarjeta) => void
  onDelete: (tarjeta: KanbanTarjeta) => void
  className?: string
}

export function KanbanTarjetaMenu({ tarjeta, onEdit, onDuplicate, onDelete, className }: KanbanTarjetaMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="xs" className={cn("px-1", className)}
          aria-label={`Acciones para ${tarjeta.titulo}`}>
          <EllipsisVertical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onEdit(tarjeta)}><Pencil aria-hidden="true" />Editar</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onDuplicate(tarjeta)}><Copy aria-hidden="true" />Duplicar</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onDelete(tarjeta)}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive">
          <Trash2 aria-hidden="true" />Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
