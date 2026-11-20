"use client"

import Link from "next/link"
import { CircleCheck, CircleX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { usePromociones } from "@/lib/hooks/usePromociones"
import type { EmpleadoPromocion } from "@/lib/promociones/types"
import { calcularAptitud, formatMeses, mesesEnPuesto, porcentajeCursos, ultimaEvaluacion } from "@/lib/promociones/utils"
import { cn } from "@/lib/utils"
import { AptitudBadge, CriterioRow } from "./prom-shared"

const SECTION_TITLE = "flex items-baseline gap-2 text-eyebrow uppercase text-muted-foreground"
const PANEL = "rounded-xl border border-border bg-card"

/** "2026-11-18" → "18/11/2026"; otros formatos se muestran tal cual. */
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
  const meses = mesesEnPuesto(empleado.fechaIngresoPuesto)
  const cursos = porcentajeCursos(empleado.cursosRequeridos)
  const evaluacion = ultimaEvaluacion(empleado.evaluaciones)
  return (
    <div className={cn(PANEL, "divide-y divide-border px-4")}>
      <CriterioRow label="Temporalidad en el puesto" cumple={meses >= regla.minTemporalidadMeses}
        valor={formatMeses(meses)} minimo={formatMeses(regla.minTemporalidadMeses)} />
      <CriterioRow label="Cursos completados" cumple={cursos >= regla.minPorcentajeCursos}
        valor={cursos} minimo={regla.minPorcentajeCursos} unidad="%" />
      <CriterioRow label="Evaluación de desempeño" cumple={Boolean(evaluacion && evaluacion.calificacion >= regla.minCalificacionEvaluacion)}
        valor={evaluacion ? evaluacion.calificacion : "—"} minimo={regla.minCalificacionEvaluacion} />
    </div>
  )
}

function Evaluaciones({ empleado }: { empleado: EmpleadoPromocion }) {
  if (!empleado.evaluaciones.length) return <p className="text-body-sm text-muted-foreground">Sin evaluaciones registradas.</p>
  const minimo = empleado.regla?.minCalificacionEvaluacion
  const ordenadas = [...empleado.evaluaciones].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  return (
    <ul className={cn(PANEL, "divide-y divide-border")}>
      {ordenadas.map((evaluacion, index) => (
        <li key={`${evaluacion.fecha}-${index}`} className="flex min-h-11 items-center gap-3 px-4 py-2">
          <div className="grid min-w-0 flex-1 gap-0.5">
            <p className="text-body-md tabular-nums text-foreground">
              {formatDate(evaluacion.fecha)}{evaluacion.periodo && <span className="text-muted-foreground"> · {evaluacion.periodo}</span>}
            </p>
            {evaluacion.evaluador && <p className="truncate text-body-sm text-muted-foreground">{evaluacion.evaluador}</p>}
          </div>
          {/* Contra el mínimo de la regla; sin regla no se califica el color. */}
          <span className={cn("text-label-sm tabular-nums", minimo === undefined ? "text-foreground"
            : evaluacion.calificacion >= minimo ? "text-success" : "text-destructive")}>
            {evaluacion.calificacion}
          </span>
        </li>
      ))}
    </ul>
  )
}

function Cursos({ empleado }: { empleado: EmpleadoPromocion }) {
  if (!empleado.cursosRequeridos.length) return <p className="text-body-sm text-muted-foreground">Sin cursos asignados para este puesto.</p>
  return (
    <ul className={cn(PANEL, "divide-y divide-border")}>
      {empleado.cursosRequeridos.map(curso => (
        <li key={curso.nombre} className="flex min-h-11 items-center gap-3 px-4 py-2">
          {curso.completado
            ? <CircleCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
            : <CircleX className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
          <p className={cn("min-w-0 flex-1 break-words text-body-md", curso.completado ? "text-foreground" : "text-muted-foreground")}>
            <span className="sr-only">{curso.completado ? "Completado: " : "Pendiente: "}</span>{curso.nombre}
          </p>
          {curso.completado && (curso.calificacion !== undefined || curso.fechaAplicacion) && (
            <span className="shrink-0 text-body-sm tabular-nums text-muted-foreground">
              {[curso.calificacion, curso.fechaAplicacion && formatDate(curso.fechaAplicacion)].filter(item => item !== undefined && item !== "").join(" · ")}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

function DetalleSkeleton() {
  return (
    <div role="status" aria-label="Cargando detalle" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-6 w-72 max-w-full" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map(item => <Skeleton key={item} aria-hidden="true" className="h-64 rounded-xl" />)}
      </div>
    </div>
  )
}

/**
 * Detalle de promoción de un empleado: criterios de su regla, evaluaciones y
 * cursos requeridos. En escritorio, criterios y evaluaciones a la izquierda y
 * cursos a la derecha; en celular, uno debajo del otro.
 */
export function PromDetallePage({ empleadoId }: { empleadoId: string }) {
  const { empleados, loading, error } = usePromociones()
  const empleado = empleados.find(item => item.id === empleadoId)

  if (loading) return <DetalleSkeleton />
  if (error || !empleado) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4">
        <p className="text-body-md text-foreground">{error ?? "No se encontró el empleado."}</p>
        <Button asChild variant="outline" size="sm"><Link href="/promociones">Volver a Categorías</Link></Button>
      </div>
    )
  }

  const completados = empleado.cursosRequeridos.filter(curso => curso.completado).length
  const total = empleado.cursosRequeridos.length
  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="grid min-w-0 gap-1">
          {empleado.numero && <p className="text-body-sm tabular-nums text-muted-foreground">Núm. {empleado.numero}</p>}
          <h2 className="break-words text-heading-md text-foreground">{empleado.nombre}</h2>
          <p className="text-body-md text-muted-foreground">
            {[empleado.puesto, empleado.departamento].filter(Boolean).join(" · ")}
            {empleado.regla?.promocionA && <> <span aria-hidden="true">→</span><span className="sr-only">, promoción a</span> {empleado.regla.promocionA}</>}
          </p>
        </div>
        <AptitudBadge status={calcularAptitud(empleado)} />
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="grid gap-6">
          <section aria-labelledby="detalle-criterios" className="grid gap-3">
            <h3 id="detalle-criterios" className={SECTION_TITLE}>Criterios de promoción</h3>
            <Criterios empleado={empleado} />
          </section>
          <section aria-labelledby="detalle-evaluaciones" className="grid gap-3">
            <h3 id="detalle-evaluaciones" className={SECTION_TITLE}>
              Evaluaciones de desempeño <span className="tabular-nums">{empleado.evaluaciones.length}</span>
            </h3>
            <Evaluaciones empleado={empleado} />
          </section>
        </div>

        <section aria-labelledby="detalle-cursos" className="grid gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="detalle-cursos" className={SECTION_TITLE}>Cursos requeridos</h3>
            {total > 0 && <span className="text-body-sm tabular-nums text-muted-foreground">{completados} de {total}</span>}
          </div>
          {total > 0 && <Progress value={porcentajeCursos(empleado.cursosRequeridos)} className="h-1.5" aria-label={`${completados} de ${total} cursos completados`} />}
          <Cursos empleado={empleado} />
        </section>
      </div>
    </div>
  )
}
