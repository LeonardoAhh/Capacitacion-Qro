"use client"

import { createContext, useContext } from "react"
import {
  BellRing, CalendarDays, CircleSlash, Copy, EllipsisVertical, Flag, HandHelping, LayoutTemplate, ListTodo,
  Pencil, Sun, SunDim, Trash2, UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  estaVencida, etiquetaPrioridad, etiquetaTipo, formatRango, iniciales, participa,
  type KanbanMiembro, type KanbanPrioridad, type KanbanTarjeta, type KanbanTipo,
} from "@/lib/kanban"

/** Piezas compartidas por la vista de tablero y la de lista. */

// Solo la bandera lleva color; el texto de la prioridad la acompaña en tono neutro.
export const COLOR_PRIORIDAD: Record<KanbanPrioridad, string> = {
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

const AVATAR = "flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-eyebrow text-secondary-foreground"

/** Iniciales del responsable; el nombre completo queda en title y para lectores de pantalla. */
export function KanbanAvatar({ miembro, rol = "Responsable", className }: { miembro: KanbanMiembro; rol?: string; className?: string }) {
  return (
    <span title={miembro.nombre} className={cn(AVATAR, className)}>
      <span aria-hidden="true">{iniciales(miembro.nombre)}</span>
      <span className="sr-only">{rol}: {miembro.nombre}</span>
    </span>
  )
}

const MAX_AVATARES = 3

/** Responsable y colaboradores apilados; a partir del cuarto se muestra "+n". */
export function KanbanPersonas({ tarjeta, miembros }: { tarjeta: KanbanTarjeta; miembros: Map<string, KanbanMiembro> }) {
  const personas = [
    ...(tarjeta.responsable_id ? [{ id: tarjeta.responsable_id, rol: "Responsable" }] : []),
    ...tarjeta.colaboradores.map(id => ({ id, rol: "Colabora" })),
  ].flatMap(persona => {
    const miembro = miembros.get(persona.id)
    return miembro ? [{ ...persona, miembro }] : []
  })
  if (!personas.length) return null
  const ocultas = personas.slice(MAX_AVATARES)
  return (
    <span className="flex shrink-0 items-center -space-x-1.5">
      {personas.slice(0, MAX_AVATARES).map(persona => (
        <KanbanAvatar key={persona.id} miembro={persona.miembro} rol={persona.rol} className="ring-2 ring-card" />
      ))}
      {ocultas.length > 0 && (
        <span title={ocultas.map(persona => persona.miembro.nombre).join(", ")} className={cn(AVATAR, "ring-2 ring-card")}>
          <span aria-hidden="true">+{ocultas.length}</span>
          <span className="sr-only">Colaboran también: {ocultas.map(persona => persona.miembro.nombre).join(", ")}</span>
        </span>
      )}
    </span>
  )
}

/** Pedido de apoyo: solo ícono en la tarjeta; la nota queda en title y para lectores de pantalla. */
export function KanbanApoyo({ tarjeta }: { tarjeta: KanbanTarjeta }) {
  if (!tarjeta.necesita_apoyo) return null
  const texto = tarjeta.apoyo_nota ? `Pide apoyo: ${tarjeta.apoyo_nota}` : "Pide apoyo"
  return (
    <span title={texto} className="flex shrink-0 items-center text-info">
      <HandHelping className="size-4" aria-hidden="true" />
      <span className="sr-only">{texto}</span>
    </span>
  )
}

/** Bloqueo: una línea con el motivo, para que se entienda sin abrir la tarjeta. */
export function KanbanBloqueo({ tarjeta }: { tarjeta: KanbanTarjeta }) {
  if (!tarjeta.bloqueo_motivo) return null
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-body-sm text-warning">
      <CircleSlash className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate" title={tarjeta.bloqueo_motivo}>Esperando: {tarjeta.bloqueo_motivo}</span>
    </p>
  )
}

/** Acciones sobre una tarjeta; las provee la página para no pasarlas por cada nivel. */
export interface KanbanAcciones {
  userId: string | null
  miDia: Set<string>
  editar: (tarjeta: KanbanTarjeta) => void
  duplicar: (tarjeta: KanbanTarjeta) => void
  guardarPlantilla: (tarjeta: KanbanTarjeta) => void
  alternarMiDia: (tarjeta: KanbanTarjeta) => void
  pedirApoyo: (tarjeta: KanbanTarjeta) => void
  quitarApoyo: (tarjeta: KanbanTarjeta) => void
  tomar: (tarjeta: KanbanTarjeta) => void
  bloquear: (tarjeta: KanbanTarjeta) => void
  desbloquear: (tarjeta: KanbanTarjeta) => void
  eliminar: (tarjeta: KanbanTarjeta) => void
}

const KanbanAccionesContext = createContext<KanbanAcciones | null>(null)
export const KanbanAccionesProvider = KanbanAccionesContext.Provider

export function useKanbanAcciones(): KanbanAcciones {
  const acciones = useContext(KanbanAccionesContext)
  if (!acciones) throw new Error("useKanbanAcciones requiere KanbanAccionesProvider")
  return acciones
}

/** Menú ⋮ agrupado: la tarjeta, mi día, el equipo y, al final, eliminar. */
export function KanbanTarjetaMenu({ tarjeta, className }: { tarjeta: KanbanTarjeta; className?: string }) {
  const acciones = useKanbanAcciones()
  const concluida = tarjeta.estado === "concluido"
  const enMiDia = acciones.miDia.has(tarjeta.id)
  const puedeTomar = tarjeta.necesita_apoyo && acciones.userId !== null && !participa(tarjeta, acciones.userId)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="xs" className={cn("px-1", className)}
          aria-label={`Acciones para ${tarjeta.titulo}`}>
          <EllipsisVertical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => acciones.editar(tarjeta)}><Pencil aria-hidden="true" />Editar</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => acciones.duplicar(tarjeta)}><Copy aria-hidden="true" />Duplicar</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => acciones.guardarPlantilla(tarjeta)}>
          <LayoutTemplate aria-hidden="true" />Guardar como plantilla
        </DropdownMenuItem>
        {(!concluida || enMiDia) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => acciones.alternarMiDia(tarjeta)}>
              {enMiDia ? <><SunDim aria-hidden="true" />Quitar de mi día</> : <><Sun aria-hidden="true" />Agregar a mi día</>}
            </DropdownMenuItem>
          </>
        )}
        {!concluida && (
          <>
            <DropdownMenuSeparator />
            {puedeTomar && (
              <DropdownMenuItem onSelect={() => acciones.tomar(tarjeta)}><UserPlus aria-hidden="true" />Tomar</DropdownMenuItem>
            )}
            {tarjeta.necesita_apoyo ? (
              <DropdownMenuItem onSelect={() => acciones.quitarApoyo(tarjeta)}><HandHelping aria-hidden="true" />Ya no necesita apoyo</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => acciones.pedirApoyo(tarjeta)}><HandHelping aria-hidden="true" />Pedir apoyo</DropdownMenuItem>
            )}
            {tarjeta.bloqueo_motivo ? (
              <DropdownMenuItem onSelect={() => acciones.desbloquear(tarjeta)}><CircleSlash aria-hidden="true" />Desbloquear</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => acciones.bloquear(tarjeta)}><CircleSlash aria-hidden="true" />Marcar bloqueada</DropdownMenuItem>
            )}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => acciones.eliminar(tarjeta)}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive">
          <Trash2 aria-hidden="true" />Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
