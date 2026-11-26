"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, BookOpen, ChartNoAxesColumnIncreasing, Circle, CircleCheck, ListChecks, TriangleAlert } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { SectionNavLayout, type SectionNavItem } from "@/components/ui/section-nav-layout"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePromociones } from "@/lib/hooks/usePromociones"
import { formatPromotionDate } from "@/lib/promociones/dialog-config"
import { getPromotionRowView } from "@/lib/promociones/table-view"
import type { EmpleadoPromocion } from "@/lib/promociones/types"
import { calcularDesbloqueoExamen, formatMeses } from "@/lib/promociones/utils"
import { cn } from "@/lib/utils"
import { AptitudBadge, CriterioRow } from "./prom-shared"

type DetalleSection = "criterios" | "evaluaciones" | "cursos"

const SECCIONES: readonly SectionNavItem<DetalleSection>[] = [
  { id: "criterios", label: "Criterios", icon: ListChecks },
  { id: "evaluaciones", label: "Evaluaciones", icon: ChartNoAxesColumnIncreasing },
  { id: "cursos", label: "Cursos", icon: BookOpen },
]

const SECTION_TITLE = "flex items-baseline gap-2 text-eyebrow uppercase text-muted-foreground"
const PANEL = "rounded-xl border border-border bg-card"

/** "2026-11-18" -> "18/11/2026"; otros formatos se muestran tal cual. */
function formatDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10).split("-").reverse().join("/") : value
}

function Criterios({ empleado }: { empleado: EmpleadoPromocion }) {
  const { regla } = empleado
  if (!regla) {
    return (
      <p role="status" className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-body-md text-foreground">
        El puesto no tiene una regla de promoción configurada.
      </p>
    )
  }

  const view = getPromotionRowView(empleado)
  const fechaDesbloqueo = calcularDesbloqueoExamen(empleado)
  const examenValor = empleado.calificacionExamen != null ? empleado.calificacionExamen : "Sin captura"

  return (
    <div className="grid gap-3">
      <div className={cn(PANEL, "divide-y divide-border px-4")}>
        <CriterioRow
          label="Temporalidad en el puesto"
          cumple={view.cumpleTemporalidad === true}
          valor={formatMeses(view.meses)}
          minimo={formatMeses(regla.minTemporalidadMeses)}
        />
        <CriterioRow
          label="Cursos completados"
          cumple={view.cumpleCursos === true}
          valor={view.porcentajeCompletado}
          minimo={regla.minPorcentajeCursos}
          unidad="%"
        />
        <CriterioRow
          label="Evaluación de desempeño"
          cumple={view.cumpleEvaluacion === true}
          valor={view.evaluacion ? view.evaluacion.calificacion : "Sin evaluar"}
          minimo={regla.minCalificacionEvaluacion}
        />
        {regla.minCalificacionExamen != null && (
          <CriterioRow
            label="Examen"
            cumple={view.cumpleExamen === true}
            valor={examenValor}
            minimo={regla.minCalificacionExamen}
          />
        )}
      </div>

      {fechaDesbloqueo && (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" aria-hidden="true" />
          <AlertDescription>
            Límite de intentos agotado. Próximo intento disponible el {formatPromotionDate(fechaDesbloqueo)}.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

function Evaluaciones({ empleado }: { empleado: EmpleadoPromocion }) {
  if (!empleado.evaluaciones.length) {
    return (
      <p className={cn(PANEL, "px-4 py-3 text-body-sm text-muted-foreground")}>
        Sin evaluaciones registradas.
      </p>
    )
  }
  const minimo = empleado.regla?.minCalificacionEvaluacion
  const ordenadas = [...empleado.evaluaciones].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  return (
    <ul className={cn(PANEL, "divide-y divide-border")}>
      {ordenadas.map((evaluacion, index) => (
        <li key={`${evaluacion.fecha}-${index}`} className="flex min-h-(--control-height) items-center gap-3 px-4 py-2">
          <div className="grid min-w-0 flex-1 gap-0.5">
            <p className="text-body-md tabular-nums text-foreground">
              {formatDate(evaluacion.fecha)}{evaluacion.periodo && <span className="text-muted-foreground"> · {evaluacion.periodo}</span>}
            </p>
            {evaluacion.evaluador && <p className="truncate text-body-sm text-muted-foreground">{evaluacion.evaluador}</p>}
          </div>
          {/* Contra el mínimo de la regla; sin regla no se califica el color. */}
          <span className={cn("shrink-0 text-label-sm tabular-nums", minimo === undefined ? "text-foreground"
            : evaluacion.calificacion >= minimo ? "text-success" : "text-destructive")}>
            {evaluacion.calificacion}
          </span>
        </li>
      ))}
    </ul>
  )
}

const COURSE_HEAD = "whitespace-nowrap text-eyebrow uppercase"

function Cursos({ empleado }: { empleado: EmpleadoPromocion }) {
  if (!empleado.cursosRequeridos.length) {
    return (
      <p className={cn(PANEL, "px-4 py-3 text-body-sm text-muted-foreground")}>
        Sin cursos asignados para este puesto.
      </p>
    )
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table aria-label="Cursos requeridos" className="table-fixed">
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className={COURSE_HEAD}>Curso</TableHead>
            <TableHead scope="col" className={cn(COURSE_HEAD, "hidden w-32 text-right sm:table-cell")}>Fecha</TableHead>
            <TableHead scope="col" className={cn(COURSE_HEAD, "w-32 text-right")}>Calificación</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empleado.cursosRequeridos.map((curso, index) => {
            const fecha = curso.completado && curso.fechaAplicacion ? formatDate(curso.fechaAplicacion) : null
            const calificacion = curso.completado && curso.calificacion !== undefined ? curso.calificacion : null
            return (
              <TableRow key={`${curso.nombre}-${index}`}>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-2.5">
                    {curso.completado
                      ? <CircleCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
                      : <Circle className="size-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />}
                    <div className="min-w-0 flex-1">
                      <p className={cn("break-words text-body-md", curso.completado ? "text-foreground" : "text-muted-foreground")}>
                        <span className="sr-only">{curso.completado ? "Completado: " : "Pendiente: "}</span>
                        {curso.nombre}
                      </p>
                      {fecha && (
                        <p className="text-body-sm tabular-nums text-muted-foreground sm:hidden">{fecha}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden w-32 text-right text-body-sm tabular-nums text-muted-foreground sm:table-cell">
                  {fecha ?? (
                    <span>
                      <span aria-hidden="true">-</span>
                      <span className="sr-only">Sin fecha</span>
                    </span>
                  )}
                </TableCell>
                <TableCell className={cn("w-32 text-right text-body-sm tabular-nums", calificacion !== null ? "font-medium text-foreground" : "text-muted-foreground")}>
                  {calificacion !== null ? calificacion : (
                    <span>
                      <span aria-hidden="true">-</span>
                      <span className="sr-only">Sin calificación</span>
                    </span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function DetalleSkeleton() {
  return (
    <div role="status" aria-label="Cargando detalle de promoción" className="grid gap-6">
      <div className="grid gap-2 border-b border-border pb-4 dense:pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-7 w-72 max-w-full" />
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <div>
          <Skeleton className="h-(--control-height) w-full rounded-md lg:hidden" />
          <div className="hidden gap-1 lg:grid">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-(--control-height) w-full rounded-md" />
            ))}
          </div>
        </div>
        <div className={cn(PANEL, "divide-y divide-border px-4")}>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex items-center justify-between gap-4 py-3">
              <Skeleton className="h-4 w-48 max-w-[60%]" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Detalle de promoción de un empleado con navegación lateral interna (Criterios,
 * Evaluaciones y Cursos). En pantallas menores a lg la navegación colapsa a un
 * selector.
 */
export function PromDetallePage({ empleadoId }: { empleadoId: string }) {
  const { empleados, loading, error } = usePromociones()
  const [section, setSection] = useState<DetalleSection>("criterios")
  const empleado = empleados.find(item => item.id === empleadoId)

  if (loading) return <DetalleSkeleton />
  if (error || !empleado) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4">
        <p className="text-body-md text-foreground">{error ?? "No se encontró el empleado."}</p>
        <Button asChild variant="outline" size="sm" className="touch-target"><Link href="/promociones">Volver a Categorías</Link></Button>
      </div>
    )
  }

  const view = getPromotionRowView(empleado)
  const completados = view.cursosCompletados
  const total = empleado.cursosRequeridos.length
  const identidadMeta = [empleado.numero && `#${empleado.numero}`, empleado.departamento].filter(Boolean).join(" · ")

  return (
    <div className="grid gap-5 dense:gap-4">
      <header className="grid min-w-0 gap-1.5 border-b border-border pb-4 dense:pb-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h2 className="min-w-0 break-words text-heading-md text-foreground sm:text-heading-lg">{empleado.nombre}</h2>
          <AptitudBadge status={view.aptitud} />
        </div>
        {(identidadMeta || empleado.puesto) && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-body-sm text-muted-foreground">
            {identidadMeta && <span className="tabular-nums">{identidadMeta}</span>}
            {identidadMeta && empleado.puesto && <span aria-hidden="true" className="text-muted-foreground/60">·</span>}
            {empleado.puesto && (
              <span className="inline-flex flex-wrap items-center gap-x-1.5">
                <span>{empleado.puesto}</span>
                {empleado.regla?.promocionA && (
                  <>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="sr-only">promoción a </span>
                    <span className="font-medium text-foreground">{empleado.regla.promocionA}</span>
                  </>
                )}
              </span>
            )}
          </p>
        )}
      </header>

      <SectionNavLayout
        label="Apartados del detalle de promoción"
        items={SECCIONES}
        value={section}
        onValueChange={setSection}
      >
        {section === "criterios" ? (
          <div className="grid gap-3">
            <h3 className={SECTION_TITLE}>Criterios de promoción</h3>
            <Criterios empleado={empleado} />
          </div>
        ) : section === "cursos" ? (
          <div className="grid gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className={SECTION_TITLE}>Cursos requeridos</h3>
              {total > 0 && <span className="text-body-sm tabular-nums text-muted-foreground">{completados} de {total}</span>}
            </div>
            <Cursos empleado={empleado} />
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className={SECTION_TITLE}>Evaluaciones de desempeño</h3>
              <span className="text-body-sm tabular-nums text-muted-foreground">{empleado.evaluaciones.length}</span>
            </div>
            <Evaluaciones empleado={empleado} />
          </div>
        )}
      </SectionNavLayout>
    </div>
  )
}
