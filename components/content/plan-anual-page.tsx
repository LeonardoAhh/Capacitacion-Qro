"use client"

import { useEffect, useState } from "react"
import { CalendarPlus, FileInput, Plus, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useRole } from "@/lib/hooks"
import { notify } from "@/lib/notify"
import { useCatalogoCursos } from "@/lib/hooks/useCatalogoCursos"
import { cargarAniosPlan, cargarPlan, eliminarCurso, guardarCurso, guardarSeguimiento, iniciarMes, MESES, nombreCursoPlan, PLAN_YEAR_MAX, PLAN_YEAR_MIN, type CursoPlan, type CursoSeguimiento, type DatosCurso, type DatosSeguimiento } from "@/lib/plan-anual"
import { PlanAnualCourseDialog } from "@/components/content/plan-anual-course-dialog"
import { PlanAnualStartDialog } from "@/components/content/plan-anual-start-dialog"
import { PlanAnualTable } from "@/components/content/plan-anual-table"
import { PlanAnualProgressDialog } from "@/components/content/plan-anual-progress-dialog"
import { PlanAnualMetricsDialog } from "@/components/content/plan-anual-metrics-dialog"
import { PlanAnualDncDialog } from "@/components/content/plan-anual-dnc-dialog"
import type { CursoImportado } from "@/lib/plan-anual-dnc"

/** Acción de la barra: con poco espacio solo muestra el ícono y su nombre va en el tooltip. */
function ToolbarAction({ icon: Icon, label, variant = "outline", onClick }: {
  icon: LucideIcon
  label: string
  variant?: "default" | "outline"
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant={variant} onClick={onClick} aria-label={label} className="px-3">
          <Icon aria-hidden="true" />
          <span className="hidden @3xl:inline">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

export default function PlanAnualPage() {
  const { canEdit } = useRole()
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(1)
  const [months, setMonths] = useState<number[]>([])
  const [planYears, setPlanYears] = useState<number[]>([])
  const [courses, setCourses] = useState<CursoPlan[]>([])
  const [loadedYear, setLoadedYear] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startOpen, setStartOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [courseDialog, setCourseDialog] = useState<CursoPlan | "new" | null>(null)
  const [progressCourse, setProgressCourse] = useState<CursoSeguimiento | null>(null)
  const [metricsCourse, setMetricsCourse] = useState<CursoPlan | null>(null)
  const catalogo = useCatalogoCursos()

  // Los años con plan no dependen del año visible: una sola consulta por visita.
  useEffect(() => {
    let active = true
    cargarAniosPlan().then(anios => {
      if (active) setPlanYears(anios)
    }).catch(() => {
      // El selector sigue ofreciendo el año actual y el siguiente.
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    cargarPlan(year).then(data => {
      if (!active) return
      setMonths(data.meses)
      setCourses(data.cursos)
      setSelectedMonth(current => data.meses.includes(current) ? current : data.meses[0] ?? 1)
      setLoadedYear(year)
    }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar el plan anual.")
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [year])

  const ready = loadedYear === year && !loading && !error
  const currentYear = new Date().getFullYear()
  const nextYear = Math.min(PLAN_YEAR_MAX, Math.max(currentYear, ...planYears) + 1)
  const yearOptions = [...new Set([currentYear, nextYear, year, ...planYears])]
    .filter(option => option >= PLAN_YEAR_MIN && option <= PLAN_YEAR_MAX)
    .sort((left, right) => right - left)
  const availableMonths = MESES.map((_, index) => index + 1).filter(month => !months.includes(month))
  const monthOptions = months.length ? months : [selectedMonth]
  const visibleCourses = courses.filter(course => course.mes === selectedMonth)
  const monthStarted = months.includes(selectedMonth)

  // Tras guardar se actualiza el estado con la fila devuelta, sin recargar el año completo.
  function upsertCourse(saved: CursoPlan) {
    setCourses(current => current.some(course => course.id === saved.id)
      ? current.map(course => course.id === saved.id ? saved : course)
      : [...current, saved])
  }

  function openCourseDialog(course: CursoPlan | "new") {
    catalogo.cargar()
    setCourseDialog(course)
  }

  async function handleStart(month: number) {
    await iniciarMes(year, month)
    setMonths(current => [...current, month].sort((left, right) => left - right))
    setPlanYears(current => current.includes(year) ? current : [...current, year])
    setSelectedMonth(month)
    setStartOpen(false)
    notify.success(`${MESES[month - 1]} listo para capturar cursos`)
  }

  async function handleSave(data: DatosCurso) {
    const nextOrder = Math.max(0, ...visibleCourses.map(course => course.orden)) + 1
    upsertCourse(await guardarCurso(year, selectedMonth, nextOrder, data, courseDialog && courseDialog !== "new" ? courseDialog : undefined))
    setCourseDialog(null)
    notify.success("Curso guardado")
  }

  /** Agrega los cursos revisados desde la DNC; inicia los meses que falten. */
  async function handleImport(items: CursoImportado[]) {
    const nuevosMeses = [...new Set(items.map(item => item.mes))].filter(month => !months.includes(month))
    for (const month of nuevosMeses) await iniciarMes(year, month)
    if (nuevosMeses.length) {
      setMonths(current => [...current, ...nuevosMeses].sort((left, right) => left - right))
      setPlanYears(current => current.includes(year) ? current : [...current, year])
    }
    const ordenPorMes = new Map<number, number>()
    const guardados: CursoPlan[] = []
    try {
      for (const item of items) {
        const orden = (ordenPorMes.get(item.mes) ?? Math.max(0, ...courses.filter(course => course.mes === item.mes).map(course => course.orden))) + 1
        ordenPorMes.set(item.mes, orden)
        guardados.push(await guardarCurso(year, item.mes, orden, item.datos))
      }
    } finally {
      // Si alguno falla, los ya guardados se quedan visibles; el modal muestra el error.
      if (guardados.length) setCourses(current => [...current, ...guardados])
    }
    setImportOpen(false)
    setSelectedMonth(items[0].mes)
    notify.success(guardados.length === 1 ? "1 curso agregado al plan" : `${guardados.length} cursos agregados al plan`)
  }

  async function handleDelete(course: CursoPlan) {
    const confirmed = await notify.confirm({
      title: "Eliminar curso",
      description: `Se eliminará «${nombreCursoPlan(course)}» de ${MESES[selectedMonth - 1]}.`,
      confirmLabel: "Eliminar",
      tone: "destructive",
      appearance: "minimal",
    })
    if (!confirmed) return
    try {
      await eliminarCurso(course.id)
      setCourses(current => current.filter(item => item.id !== course.id))
      notify.success("Curso eliminado")
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : "No se pudo eliminar el curso.")
    }
  }

  async function handleProgressSave(data: DatosSeguimiento) {
    if (!progressCourse) return
    upsertCourse(await guardarSeguimiento(progressCourse.id, data))
    setProgressCourse(null)
    notify.success("Seguimiento guardado")
  }

  return (
    <div className="space-y-6">
      {/* Una sola fila: filtros a la izquierda y acciones a la derecha. Las etiquetas de los
          botones aparecen cuando el área de trabajo tiene espacio (consulta de contenedor). */}
      <div className="@container">
        <div className="flex items-center gap-2">
          {ready && (
            <>
              <Label htmlFor="plan-mes-vista" className="sr-only">Mes</Label>
              <Select value={String(selectedMonth)} onValueChange={value => setSelectedMonth(Number(value))}>
                <SelectTrigger id="plan-mes-vista" className="w-36 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {monthOptions.map(month => (
                    <SelectItem key={month} value={String(month)}>
                      {MESES[month - 1]}{months.length ? "" : " · Sin iniciar"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          <Label htmlFor="plan-anio" className="sr-only">Año</Label>
          <Select value={String(year)} onValueChange={value => {
            setYear(Number(value))
            setSelectedMonth(1)
          }}>
            <SelectTrigger id="plan-anio" className="w-24 shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearOptions.map(option => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}
            </SelectContent>
          </Select>
          {canEdit && ready && (
            <TooltipProvider delayDuration={300}>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <ToolbarAction icon={FileInput} label="Traer desde la DNC" onClick={() => setImportOpen(true)} />
                {monthStarted && <ToolbarAction icon={Plus} label="Agregar curso" onClick={() => openCourseDialog("new")} />}
                {availableMonths.length > 0 && <ToolbarAction icon={CalendarPlus} label="Iniciar mes" variant="default" onClick={() => setStartOpen(true)} />}
              </div>
            </TooltipProvider>
          )}
        </div>
      </div>

      {error && <p role="alert" className="text-body-md text-destructive">{error}</p>}
      {loading && <Skeleton className="h-32 w-full rounded-xl" aria-label="Cargando plan anual" />}

      {ready && (
        <Card>
          <PlanAnualTable cursos={visibleCourses} canEdit={canEdit} onOpen={setProgressCourse} onMetrics={setMetricsCourse}
            onEdit={openCourseDialog} onDelete={handleDelete} />
        </Card>
      )}

      {startOpen && (
        <PlanAnualStartDialog anio={year} disponibles={availableMonths} preferredMonth={selectedMonth}
          onClose={() => setStartOpen(false)} onStart={handleStart} />
      )}
      {courseDialog && (
        <PlanAnualCourseDialog key={courseDialog === "new" ? "new" : courseDialog.id}
          curso={courseDialog === "new" ? null : courseDialog} mes={MESES[selectedMonth - 1]}
          catalog={catalogo.cursos} catalogLoading={catalogo.loading} catalogError={catalogo.error}
          onClose={() => setCourseDialog(null)} onSave={handleSave} />
      )}
      {importOpen && (
        <PlanAnualDncDialog anio={year} cursosPlan={courses}
          onClose={() => setImportOpen(false)} onImport={handleImport} />
      )}
      {progressCourse && (
        <PlanAnualProgressDialog key={progressCourse.id} curso={progressCourse} canEdit={canEdit}
          onClose={() => setProgressCourse(null)} onSave={handleProgressSave} />
      )}
      {metricsCourse && (
        <PlanAnualMetricsDialog key={metricsCourse.id} curso={metricsCourse}
          onClose={() => setMetricsCourse(null)} />
      )}
    </div>
  )
}
