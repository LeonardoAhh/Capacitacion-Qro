"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { DncCreateDialog } from "@/components/content/dnc-create-dialog"
import { DncNeedDialog } from "@/components/content/dnc-need-dialog"
import { DncTableSkeleton } from "@/components/content/dnc-needs-table"
import { DncReport } from "@/components/content/dnc-report"
import { useRole } from "@/lib/hooks"
import { useCatalogoCursos } from "@/lib/hooks/useCatalogoCursos"
import { notify } from "@/lib/notify"
import { PLAN_YEAR_MAX, PLAN_YEAR_MIN } from "@/lib/plan-anual"
import {
  cargarAnioDnc, cargarCatalogosDnc, crearReporteDnc, eliminarNecesidadDnc, guardarEncabezadoDnc, guardarNecesidadDnc,
  nombreDepartamento, ordenarReportes, programacionPrevia, sincronizarProgramacionDnc, type CambiosEncabezadoDnc, type DatosNecesidad, type DncDepartment, type DncNecesidad, type DncPosition, type DncReporte,
} from "@/lib/dnc"

export default function DncPage() {
  const { canEdit } = useRole()
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [loadedYear, setLoadedYear] = useState<number | null>(null)
  const [catalogsReady, setCatalogsReady] = useState(false)
  const [departments, setDepartments] = useState<DncDepartment[]>([])
  const [positions, setPositions] = useState<DncPosition[]>([])
  const [reports, setReports] = useState<DncReporte[]>([])
  const [needs, setNeeds] = useState<DncNecesidad[]>([])
  const [savedYears, setSavedYears] = useState<number[]>([])
  const [selectedReportId, setSelectedReportId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [needDialog, setNeedDialog] = useState<DncNecesidad | "new" | null>(null)
  const cursos = useCatalogoCursos()

  // Departamentos, puestos y años no dependen del año visible: una sola carga por visita.
  useEffect(() => {
    let active = true
    cargarCatalogosDnc().then(data => {
      if (!active) return
      setDepartments(data.departamentos)
      setPositions(data.puestos)
      setSavedYears(data.anios)
      setCatalogsReady(true)
    }).catch(cause => {
      if (active) setCatalogError(cause instanceof Error ? cause.message : "No se pudo cargar el DNC.")
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    cargarAnioDnc(year).then(data => {
      if (!active) return
      setReports(data.reportes)
      setNeeds(data.necesidades)
      setSelectedReportId(current => data.reportes.some(reporte => reporte.id === current)
        ? current : data.reportes[0]?.id ?? "")
      setLoadedYear(year)
    }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar el DNC.")
    })
    return () => { active = false }
  }, [year])

  const loadError = catalogError ?? error
  const ready = catalogsReady && loadedYear === year && !loadError
  const currentYear = new Date().getFullYear()
  const nextYear = Math.min(PLAN_YEAR_MAX, Math.max(currentYear, ...savedYears) + 1)
  const yearOptions = [...new Set([year, currentYear, nextYear, ...savedYears])]
    .filter(option => option >= PLAN_YEAR_MIN && option <= PLAN_YEAR_MAX)
    .sort((left, right) => right - left)
  const selectedReport = reports.find(reporte => reporte.id === selectedReportId) ?? null
  const availableDepartments = departments.filter(department =>
    !reports.some(reporte => reporte.department_id === department.id))
  const reportNeeds = needs.filter(need => need.reporte_id === selectedReportId)
  const reportPositions = positions.filter(position => position.department_id === selectedReport?.department_id)

  // Tras cada cambio se actualiza el estado con lo que devuelve la BD, sin recargar el año completo.
  async function handleCreate(departmentId: string) {
    const reporte = await crearReporteDnc(year, departmentId)
    setReports(current => ordenarReportes([...current, reporte]))
    setSavedYears(current => current.includes(year) ? current : [...current, year])
    setSelectedReportId(reporte.id)
    setCreateOpen(false)
    notify.success("Reporte DNC creado")
  }

  async function handleSaveHeader(cambios: CambiosEncabezadoDnc) {
    if (!selectedReport) return
    const updatedAt = await guardarEncabezadoDnc(selectedReport.id, cambios)
    setReports(current => current.map(reporte => reporte.id === selectedReport.id
      ? { ...reporte, ...cambios, updated_at: updatedAt }
      : reporte))
    notify.success("Cambios guardados")
  }

  function openNeedDialog(need: DncNecesidad | "new") {
    cursos.cargar()
    setNeedDialog(need)
  }

  async function handleSaveNeed(datos: DatosNecesidad) {
    if (!selectedReport) return
    const saved = await guardarNecesidadDnc(selectedReport.id, datos, needDialog && needDialog !== "new" ? needDialog : undefined)
    // Un curso tiene un solo mes y tipo en el año: las demás DNC con ese curso toman los guardados.
    const programacion = { mes_sugerido: saved.mes_sugerido, tipo: saved.tipo }
    const desfasadas = needs.filter(need => need.course_id && need.course_id === saved.course_id && need.id !== saved.id
      && (need.mes_sugerido !== saved.mes_sugerido || need.tipo !== saved.tipo)).map(need => need.id)
    await sincronizarProgramacionDnc(desfasadas, programacion)
    setNeeds(current => {
      const updated = current.map(need => desfasadas.includes(need.id) ? { ...need, ...programacion } : need)
      return updated.some(need => need.id === saved.id)
        ? updated.map(need => need.id === saved.id ? saved : need)
        : [...updated, saved]
    })
    setNeedDialog(null)
    notify.success("Necesidad guardada")
  }

  async function handleDeleteNeed(need: DncNecesidad) {
    const confirmed = await notify.confirm({
      title: "Eliminar necesidad",
      description: `Se eliminará «${need.curso_nombre}» del reporte.`,
      confirmLabel: "Eliminar",
      tone: "destructive",
      appearance: "minimal",
    })
    if (!confirmed) return
    try {
      await eliminarNecesidadDnc(need.id)
      setNeeds(current => current.filter(item => item.id !== need.id))
      notify.success("Necesidad eliminada")
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : "No se pudo eliminar la necesidad.")
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra de filtros: el valor seleccionado ya describe el filtro, la etiqueta queda para lectores de pantalla. */}
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <Label htmlFor="dnc-anio" className="sr-only">Año</Label>
          <Select value={String(year)} onValueChange={value => {
            setError(null)
            setYear(Number(value))
          }}>
            <SelectTrigger id="dnc-anio" className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearOptions.map(option => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {ready && reports.length > 0 && (
          <div className="min-w-48">
            <Label htmlFor="dnc-departamento" className="sr-only">Departamento</Label>
            <Select value={selectedReportId} onValueChange={setSelectedReportId}>
              <SelectTrigger id="dnc-departamento" className="w-auto min-w-48"><SelectValue /></SelectTrigger>
              <SelectContent matchTriggerWidth>
                {reports.map(reporte => (
                  <SelectItem key={reporte.id} value={reporte.id}>{nombreDepartamento(reporte)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {canEdit && ready && availableDepartments.length > 0 && (
          <Button type="button" variant="outline" className="ml-auto" onClick={() => setCreateOpen(true)}>Crear DNC</Button>
        )}
      </div>

      {loadError && <p role="alert" className="text-body-md text-destructive">{loadError}</p>}
      {!ready && !loadError && <Skeleton className="h-32 w-full rounded-xl" aria-label="Cargando DNC" />}
      {ready && selectedReport && (
        <DncReport key={selectedReport.id} reporte={selectedReport} necesidades={reportNeeds}
          puestos={reportPositions} canEdit={canEdit}
          onSaveHeader={handleSaveHeader} onAdd={() => openNeedDialog("new")}
          onEdit={openNeedDialog} onDelete={handleDeleteNeed} />
      )}
      {ready && !selectedReport && (departments.length ? (
        <Card className="overflow-hidden">
          <p className="sr-only">Aún no hay un DNC para este año.</p>
          <DncTableSkeleton />
        </Card>
      ) : (
        <Card className="p-6 text-body-md text-muted-foreground">Agrega departamentos en Plantilla para crear un DNC.</Card>
      ))}

      {createOpen && (
        <DncCreateDialog anio={year} disponibles={availableDepartments}
          onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
      )}
      {needDialog && selectedReport && (
        <DncNeedDialog key={needDialog === "new" ? "new" : needDialog.id}
          necesidad={needDialog === "new" ? null : needDialog}
          cursos={cursos.cursos} cursosLoading={cursos.loading} cursosError={cursos.error} puestos={reportPositions}
          departmentName={nombreDepartamento(selectedReport)}
          programacionDe={courseId => programacionPrevia(needs, reports, courseId, selectedReport.id)}
          onClose={() => setNeedDialog(null)} onSave={handleSaveNeed} />
      )}
    </div>
  )
}
