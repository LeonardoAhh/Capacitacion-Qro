"use client"

import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { EmpleadoPromocion } from "@/lib/promociones/types"
import { getCriterionTone, getUnavailableCategoryLabel, PROMOTION_TABLE_COPY as COPY } from "@/lib/promociones/table-config"
import { formatMeses, ultimaEvaluacion } from "@/lib/promociones/utils"
import { getPromotionRowView } from "@/lib/promociones/table-view"
import { cn } from "@/lib/utils"
import { AptitudBadge } from "./prom-shared"
import { PromAccionesMenu } from "./prom-acciones-menu"

/**
 * Columnas por ancho de pantalla, con ancho fijo y texto en una línea: Empleado
 * toma el resto. En móvil quedan Empleado, Estado y Acciones; los criterios van
 * en una línea debajo del nombre.
 */
const COL = {
  department: "hidden w-44 xl:table-cell",
  tenure: "hidden w-32 lg:table-cell",
  courses: "hidden w-20 md:table-cell",
  performance: "hidden w-24 md:table-cell",
  exam: "hidden w-20 lg:table-cell",
  status: "w-28",
  actions: "w-14 px-1",
} as const

const HEAD = "whitespace-nowrap text-eyebrow uppercase"
const NUMBER = "text-right text-body-sm tabular-nums"

interface Handlers {
  onPromover: (emp: EmpleadoPromocion) => void
  onCapturarExamen: (emp: EmpleadoPromocion) => void
}

/** Valor de un criterio: en rojo solo si no cumple (el color no es la única señal). */
function Criterio({ value, cumple }: { value: ReactNode; cumple: boolean | null }) {
  return <span className={getCriterionTone(cumple)}>
    {value}{cumple === false && <span className="sr-only"> ({COPY.doesNotMeet.toLowerCase()})</span>}
  </span>
}

function EmployeeCell({ emp, metrics }: { emp: EmpleadoPromocion; metrics?: ReactNode }) {
  return <TableCell>
    <span className="block truncate text-label-sm text-foreground">{emp.nombre}</span>
    <span className="block truncate text-body-sm text-muted-foreground">
      {[emp.numero && `#${emp.numero}`, emp.puesto].filter(Boolean).join(" · ")}
    </span>
    {metrics && <span className="block truncate text-body-sm text-muted-foreground md:hidden">{metrics}</span>}
  </TableCell>
}

function DepartmentCell({ emp }: { emp: EmpleadoPromocion }) {
  return <TableCell className={COL.department}>
    <span className="block truncate text-body-sm text-foreground">{emp.departamento}</span>
    {emp.area && emp.area !== emp.departamento && <span className="block truncate text-body-sm text-muted-foreground">{emp.area}</span>}
  </TableCell>
}

function Row({ emp, onPromover, onCapturarExamen }: { emp: EmpleadoPromocion } & Handlers) {
  const view = getPromotionRowView(emp)
  const cursos = <Criterio value={`${view.porcentajeCompletado}%`} cumple={view.cumpleCursos} />
  const desempeno = view.evaluacion ? <Criterio value={view.evaluacion.calificacion} cumple={view.cumpleEvaluacion} /> : COPY.noEvaluation
  return <TableRow>
    <EmployeeCell emp={emp} metrics={<>{COPY.courses} {cursos} · {COPY.performance} {desempeno}</>} />
    <DepartmentCell emp={emp} />
    <TableCell className={cn(COL.tenure, "text-body-sm")}><Criterio value={formatMeses(view.meses)} cumple={view.cumpleTemporalidad} /></TableCell>
    <TableCell className={cn(COL.courses, NUMBER)}>{cursos}</TableCell>
    <TableCell className={cn(COL.performance, NUMBER, !view.evaluacion && "text-muted-foreground")}>{desempeno}</TableCell>
    <TableCell className={cn(COL.exam, NUMBER)}>
      {emp.calificacionExamen != null ? <Criterio value={emp.calificacionExamen} cumple={view.cumpleExamen} /> : <span className="text-muted-foreground">{COPY.unavailableValue}</span>}
    </TableCell>
    <TableCell className={COL.status}><AptitudBadge status={view.aptitud} /></TableCell>
    <TableCell className={cn(COL.actions, "text-center")}>
      <PromAccionesMenu empleado={emp} onPromover={() => onPromover(emp)} onCapturarExamen={() => onCapturarExamen(emp)} />
    </TableCell>
  </TableRow>
}

/** Sin categoría para promover: solo se consulta el detalle. */
function UnavailableRow({ emp }: { emp: EmpleadoPromocion }) {
  const evaluacion = ultimaEvaluacion(emp.evaluaciones)
  const empty = <span className="text-muted-foreground"><span aria-hidden="true">{COPY.unavailableValue}</span><span className="sr-only">{COPY.notApplicable}</span></span>
  return <TableRow>
    <EmployeeCell emp={emp} />
    <DepartmentCell emp={emp} />
    <TableCell className={cn(COL.tenure, "text-body-sm")}>{empty}</TableCell>
    <TableCell className={cn(COL.courses, NUMBER)}>{empty}</TableCell>
    <TableCell className={cn(COL.performance, NUMBER, !evaluacion && "text-muted-foreground")}>{evaluacion?.calificacion ?? COPY.noEvaluation}</TableCell>
    <TableCell className={cn(COL.exam, NUMBER)}>{empty}</TableCell>
    <TableCell className={COL.status}><Badge variant="outline" size="sm" className="text-muted-foreground">{getUnavailableCategoryLabel(emp.puesto)}</Badge></TableCell>
    <TableCell className={cn(COL.actions, "text-center")}><PromAccionesMenu empleado={emp} /></TableCell>
  </TableRow>
}

function PromotionTableFrame({ label, busy, children }: { label: string; busy?: boolean; children: ReactNode }) {
  return <div className="overflow-hidden rounded-xl border bg-card">
    <Table aria-label={label} aria-busy={busy} className="table-fixed">
      <TableHeader className="bg-muted/50">
        <TableRow className="hover:bg-transparent">
          <TableHead className={HEAD}>{COPY.employee}</TableHead>
          <TableHead className={cn(HEAD, COL.department)}>{COPY.department}</TableHead>
          <TableHead className={cn(HEAD, COL.tenure)}>{COPY.tenure}</TableHead>
          <TableHead className={cn(HEAD, COL.courses, "text-right")}>{COPY.courses}</TableHead>
          <TableHead className={cn(HEAD, COL.performance, "text-right")}>{COPY.performance}</TableHead>
          <TableHead className={cn(HEAD, COL.exam, "text-right")}>{COPY.exam}</TableHead>
          <TableHead className={cn(HEAD, COL.status)}>{COPY.status}</TableHead>
          <TableHead className={COL.actions}><span className="sr-only">{COPY.actions}</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  </div>
}

const SKELETON_NAME_WIDTHS = ["w-44", "w-52", "w-40", "w-48", "w-36"] as const
const SKELETON_META_WIDTHS = ["w-36", "w-44", "w-32", "w-40", "w-28"] as const

function PromotionSkeletonRow({ index }: { index: number }) {
  const nameWidth = SKELETON_NAME_WIDTHS[index % SKELETON_NAME_WIDTHS.length]
  const metaWidth = SKELETON_META_WIDTHS[index % SKELETON_META_WIDTHS.length]
  return (
    <TableRow aria-hidden="true" className="hover:bg-transparent">
      <TableCell>
        <Skeleton className={cn("h-4 max-w-full", nameWidth)} />
        <Skeleton className={cn("mt-1.5 h-3.5 max-w-full", metaWidth)} />
        <Skeleton className="mt-1.5 h-3.5 w-32 md:hidden" />
      </TableCell>
      <TableCell className={COL.department}>
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="mt-1.5 h-3 w-28" />
      </TableCell>
      <TableCell className={COL.tenure}><Skeleton className="h-3.5 w-20" /></TableCell>
      <TableCell className={COL.courses}><Skeleton className="ml-auto h-3.5 w-10" /></TableCell>
      <TableCell className={COL.performance}><Skeleton className="ml-auto h-3.5 w-8" /></TableCell>
      <TableCell className={COL.exam}><Skeleton className="ml-auto h-3.5 w-8" /></TableCell>
      <TableCell className={COL.status}><Skeleton className="h-6 w-16 rounded-md" /></TableCell>
      <TableCell className={cn(COL.actions, "text-center")}><Skeleton className="mx-auto size-4 rounded-sm" /></TableCell>
    </TableRow>
  )
}

export function PromotionTableSkeleton({ rows = 9 }: { rows?: number }) {
  return (
    <PromotionTableFrame label="Cargando categorías" busy>
      {Array.from({ length: rows }, (_, index) => <PromotionSkeletonRow key={index} index={index} />)}
    </PromotionTableFrame>
  )
}

/**
 * Seguimiento de promociones: una tabla para todas las pantallas. Quienes no
 * tienen categoría para promover van en una segunda tabla con su propio rótulo
 * (sin filas que abarquen columnas ocultas).
 */
export function PromotionTable({ conCategoria, sinCategoria, ...handlers }: {
  conCategoria: EmpleadoPromocion[]
  sinCategoria: EmpleadoPromocion[]
} & Handlers) {
  return <div className="space-y-4">
    {conCategoria.length > 0 && <PromotionTableFrame label={COPY.accessibleName}>
      {conCategoria.map(emp => <Row key={emp.id} emp={emp} {...handlers} />)}
    </PromotionTableFrame>}
    {sinCategoria.length > 0 && <section aria-label={COPY.unavailableGroup} className="space-y-2">
      <p className="text-eyebrow uppercase text-muted-foreground">{COPY.unavailableGroup}</p>
      <PromotionTableFrame label={COPY.unavailableGroup}>
        {sinCategoria.map(emp => <UnavailableRow key={emp.id} emp={emp} />)}
      </PromotionTableFrame>
    </section>}
  </div>
}
