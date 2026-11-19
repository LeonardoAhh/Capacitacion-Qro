"use client"

import { useRouter } from "next/navigation"
import { SquareKanban } from "lucide-react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useRole } from "@/lib/hooks"
import { enlaceNuevaTarjeta, type TarjetaDesde } from "@/lib/kanban"

/**
 * Opción de menú para llevar un registro de otro módulo al Kanban: abre el tablero
 * con "Nueva tarjeta" prellenada. Oculta para quien no usa el tablero.
 */
export function KanbanCrearDesdeItem({ datos }: { datos: TarjetaDesde }) {
  const router = useRouter()
  const { isEvaluador, loading } = useRole()
  if (loading || isEvaluador) return null
  return (
    <DropdownMenuItem onSelect={() => router.push(enlaceNuevaTarjeta(datos))}>
      <SquareKanban aria-hidden="true" />Crear tarjeta en Kanban
    </DropdownMenuItem>
  )
}
