"use client"

import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
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
  onDesempeño: (emp: EmpleadoPromocion) => void
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

function Row({ emp, onPromover, onCapturarExamen, onDesempeño }: { emp: EmpleadoPromocion } & Handlers) {
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
      <PromAccionesMenu empleado={emp} onPromover={() => onPromover(emp)} onCapturarExamen={() => onCapturarExamen(emp)} onDesempeño={() => onDesempeño(emp)} />
    </TableCell>
  </TableRow>
}

/** Sin categoría para promover: solo se consulta el desempeño. */
function UnavailableRow({ emp, onDesempeño }: { emp: EmpleadoPromocion; onDesempeño: Handlers["onDesempeño"] }) {
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
    <TableCell className={cn(COL.actions, "text-center")}><PromAccionesMenu empleado={emp} onDesempeño={() => onDesempeño(emp)} /></TableCell>
  </TableRow>
}

function PromotionTableFrame({ label, children }: { label: string; children: ReactNode }) {
  return <div className="overflow-hidden rounded-xl border bg-card">
    <Table aria-label={label} className="table-fixed">
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
        {sinCategoria.map(emp => <UnavailableRow key={emp.id} emp={emp} onDesempeño={handlers.onDesempeño} />)}
      </PromotionTableFrame>
    </section>}
  </div>
}
