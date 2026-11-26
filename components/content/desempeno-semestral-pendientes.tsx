"use client"

import { Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"
import { type SemestralEmployee, type SemestralDeptGroup } from "@/lib/hooks/useSemestralPendientes"
import { DepartmentPage } from "./desempeno/department-page"
import { PendingName, PendingTable } from "./desempeno/pending-table"
import { numeroLabel } from "./desempeno/pending-presentation"

interface Props {
  loading: boolean
  deptGroups: SemestralDeptGroup[]
  activeTab: string | null
  direction: -1 | 1
}

const ESTADOS = {
  completado: { label: "Completado", variant: "success" },
  no_elegible: { label: "No aplica", variant: "secondary" },
  pendiente: { label: "Pendiente", variant: "warning" },
} as const

const COLUMNS = [
  { label: "Empleado" },
  { label: "Estado", className: "w-32" },
  { label: "Calificación", className: "hidden w-28 text-right sm:table-cell" },
]

function estadoDe(item: SemestralEmployee) {
  return item.estado === "completado" ? ESTADOS.completado : item.estado === "no_elegible" ? ESTADOS.no_elegible : ESTADOS.pendiente
}

/** Semestrales: tabla del departamento con el estado y la calificación del periodo elegido. */
export default function DesempenoSemestralPendientes({ loading, deptGroups, activeTab, direction }: Props) {
  const activeGroup = deptGroups.find((g) => g.departamento === activeTab) ?? deptGroups[0] ?? null

  if (loading) return (
    <div className="space-y-2" aria-label="Cargando evaluaciones semestrales">
      {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-(--control-height) w-full" />)}
    </div>
  )

  if (!activeGroup) return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-(--card-padding) py-12 text-center">
      <Users className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-body-md text-muted-foreground">Sin personal de planta en tu área.</p>
    </div>
  )

  return (
    <DepartmentPage pageKey={activeGroup.departamento} direction={direction}>
      <PendingTable caption={`Evaluaciones semestrales de ${activeGroup.departamento}`} columns={COLUMNS}>
        {activeGroup.items.map((item) => {
          const estado = estadoDe(item)
          return (
            <TableRow key={item.dbId}>
              <TableCell>
                <PendingName name={item.nombre} detail={[numeroLabel(item.numero), item.puesto].filter(Boolean).join(" · ")} />
              </TableCell>
              <TableCell><Badge variant={estado.variant} size="sm">{estado.label}</Badge></TableCell>
              <TableCell className="hidden text-right text-label-sm tabular-nums text-foreground sm:table-cell">
                {/* Sin calificación la celda queda vacía; el estado ya lo explica. */}
                {item.estado === "completado" ? `${item.calificacion}%` : <span className="sr-only">Sin calificación</span>}
              </TableCell>
            </TableRow>
          )
        })}
      </PendingTable>
    </DepartmentPage>
  )
}
