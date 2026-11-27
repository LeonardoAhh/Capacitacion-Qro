"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { nombreCursoPlan, type CursoPlan } from "@/lib/plan-anual"
import { cargarMetricasCurso, type CourseMetrics } from "@/lib/plan-anual-metrics"
import { describeSupabaseError } from "@/lib/supabase/errors"

interface PlanAnualMetricsDialogProps {
  curso: CursoPlan
  onClose: () => void
}

export function PlanAnualMetricsDialog({ curso, onClose }: PlanAnualMetricsDialogProps) {
  const [metrics, setMetrics] = useState<CourseMetrics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const efficiency = metrics && metrics.asistentes + metrics.pendientes > 0
    ? metrics.asistentes / (metrics.asistentes + metrics.pendientes) * 100
    : null

  useEffect(() => {
    if (!curso.course_id) return
    let active = true
    cargarMetricasCurso(curso.course_id, curso.anio, curso.mes, curso.fechas_imparticion).then(data => {
      if (active) setMetrics(data)
    }).catch(cause => {
      if (active) setError(describeSupabaseError(cause, "No se pudieron cargar las métricas"))
    })
    return () => { active = false }
  }, [curso.course_id, curso.anio, curso.mes, curso.fechas_imparticion])

  return (
    <ResponsiveShell open onClose={onClose} size="sm" title={nombreCursoPlan(curso)}
      description={`Personal pendiente de ${nombreCursoPlan(curso)}`}>
      <ModalHeader title={nombreCursoPlan(curso)} onClose={onClose} />
      <div className="px-(--card-padding) py-4">
        {!curso.course_id ? (
          <p className="text-body-md text-muted-foreground">Este curso aún no está vinculado al catálogo de Plantilla.</p>
        ) : error ? (
          <p role="alert" className="text-body-md text-destructive">{error}</p>
        ) : metrics ? (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="grid gap-1">
              <dt className="text-body-sm text-muted-foreground sm:min-h-8">Personal pendiente</dt>
              <dd className="text-heading-xl tabular-nums text-foreground">{metrics.pendientes}</dd>
            </div>
            <div className="grid gap-1">
              <dt className="text-body-sm text-muted-foreground sm:min-h-8">Personas que acudieron</dt>
              <dd className="text-heading-xl tabular-nums text-foreground">{metrics.asistentes}</dd>
            </div>
            <div className="col-span-2 grid gap-1 sm:col-span-1">
              <dt className="text-body-sm text-muted-foreground sm:min-h-8">Eficiencia de capacitación</dt>
              <dd className="text-heading-xl tabular-nums text-foreground">
                {efficiency != null
                  ? `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(efficiency)}%`
                  : "Sin datos"}
              </dd>
            </div>
          </dl>
        ) : (
          <Skeleton className="h-20 w-full rounded-md" aria-label="Cargando métricas" />
        )}
      </div>
      <ModalFooter onCancel={onClose} cancelLabel="Cerrar" />
    </ResponsiveShell>
  )
}
