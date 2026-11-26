import Link from "next/link"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableHead, TableRow } from "@/components/ui/table"
import type { NuevoIngreso } from "@/lib/hooks"
import { getUrgencyLevel } from "@/components/content/recontratacion-logic"
import { StatusBadge } from "@/components/content/recontratacion-ui"
import { cn } from "@/lib/utils"

/**
 * Columnas de la lista. Empleado toma el resto; las demás tienen ancho fijo y
 * aparecen según la pantalla. En celular el término va bajo el nombre.
 */
const COL = {
  departamento: "hidden w-48 lg:table-cell",
  termino: "hidden w-56 sm:table-cell",
  // Revisar e Imprimir con texto desde sm; en móvil, Imprimir queda solo con su ícono.
  acciones: "w-32 text-right sm:w-56",
} as const

const HEAD = "whitespace-nowrap text-eyebrow uppercase"

export function EmpleadoHeader() {
  return (
    <TableRow className="hover:bg-transparent">
      <TableHead scope="col" className={HEAD}>Empleado</TableHead>
      <TableHead scope="col" className={cn(COL.departamento, HEAD)}>Departamento</TableHead>
      <TableHead scope="col" className={cn(COL.termino, HEAD)}>Término</TableHead>
      <TableHead scope="col" className={COL.acciones}><span className="sr-only">Acciones</span></TableHead>
    </TableRow>
  )
}

export function EmpleadoRow({
  record,
  onImprimir,
}: {
  record: NuevoIngreso
  onImprimir: (numero: string) => void
}) {
  const urgency = getUrgencyLevel(record)
  const detalle = [record.numero && `#${record.numero}`, record.puesto].filter(Boolean).join(" · ")

  return (
    <TableRow>
      <TableCell className="max-w-0">
        <p className="truncate text-label-sm text-foreground" title={record.nombre}>{record.nombre}</p>
        {detalle && <p className="truncate text-body-sm text-muted-foreground" title={detalle}>{detalle}</p>}
        <div className="mt-1 sm:hidden"><StatusBadge urgency={urgency} record={record} /></div>
      </TableCell>
      <TableCell className={COL.departamento}>
        <p className="truncate text-body-sm text-muted-foreground">{record.departamento || "-"}</p>
      </TableCell>
      <TableCell className={COL.termino}>
        <StatusBadge urgency={urgency} record={record} />
      </TableCell>
      <TableCell className={cn(COL.acciones, "py-0")}>
        <div className="flex items-center justify-end gap-1">
          {record.numero ? (
            <Button asChild variant="ghost" size="sm" className="touch-target">
              <Link href={`/recontratacion/${encodeURIComponent(record.numero)}`} aria-label={`Revisar a ${record.nombre}`}>
                Revisar
              </Link>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="touch-target" disabled aria-label="Revisar: sin número asignado">Revisar</Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="touch-target"
            onClick={() => record.numero && onImprimir(record.numero)}
            disabled={!record.numero}
            aria-label={record.numero ? `Imprimir formato de ${record.nombre}` : "Imprimir: sin número asignado"}
          >
            <Printer aria-hidden="true" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function SkeletonRow() {
  return (
    <TableRow aria-hidden="true" className="hover:bg-transparent">
      <TableCell>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-2 h-3 w-1/2" />
      </TableCell>
      <TableCell className={COL.departamento}><Skeleton className="h-3 w-24" /></TableCell>
      <TableCell className={COL.termino}><Skeleton className="h-4 w-36" /></TableCell>
      <TableCell className={COL.acciones}><Skeleton className="ml-auto h-(--control-height-sm) w-24" /></TableCell>
    </TableRow>
  )
}
