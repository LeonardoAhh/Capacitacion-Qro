"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarPlus, FileInput, Pin, Plus, Printer, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useRole } from "@/lib/hooks"
import { notify } from "@/lib/notify"
import { useCatalogoCursos } from "@/lib/hooks/useCatalogoCursos"
import { cargarAniosPlan, cargarCursosFijos, cargarPlan, completarCursosFijos, eliminarCurso, guardarCurso, guardarSeguimiento, iniciarMes, MESES, nombreCursoPlan, ordenarCursosMes, type CursoFijo, type CursoPlan, type CursoSeguimiento, type DatosCurso, type DatosSeguimiento } from "@/lib/plan-anual"
import { PLAN_YEAR_MAX, PLAN_YEAR_MIN, rutaCursosFijos, rutaImportarDnc } from "@/lib/plan-anual-rutas"
import { LinkPendingIcon } from "@/components/ui/link-pending-icon"
import { PlanAnualCourseDialog } from "@/components/content/plan-anual-course-dialog"
import { PlanAnualStartDialog } from "@/components/content/plan-anual-start-dialog"
import { PlanAnualTable } from "@/components/content/plan-anual-table"
import { PlanAnualProgressDialog } from "@/components/content/plan-anual-progress-dialog"
import { PlanAnualMetricsDialog } from "@/components/content/plan-anual-metrics-dialog"
import { PlanAnualPrint } from "@/components/content/plan-anual-print"

/** Acción de la barra: con poco espacio solo muestra el ícono y su nombre va en el tooltip. */
function ToolbarAction({ icon: Icon, label, variant = "outline", disabled, onClick, href }: {
  icon: LucideIcon
  label: string
  variant?: "default" | "outline"
  disabled?: boolean
  /** Acción en la misma página (abre un modal)… */
  onClick?: () => void
  /** …o enlace a su propia página. */
  href?: string
}) {
  const texto = <span className="hidden @3xl:inline">{label}</span>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          // Si la página tarda, el ícono pasa a spinner.
          <Button asChild variant={variant} aria-label={label} className="px-3"><Link href={href}><LinkPendingIcon icon={Icon} />{texto}</Link></Button>
        ) : (
          <Button type="button" variant={variant} onClick={onClick} disabled={disabled} aria-label={label} className="px-3"><Icon aria-hidden="true" />{texto}</Button>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

export default function PlanAnualPage({ initialYear, initialMonth }: {
  /** Año y mes de la URL (`?anio=&mes=`); sin ellos, el año actual y su primer mes. */
  initialYear: number | null
  initialMonth: number | null
}) {
  const { canEdit } = useRole()
  const [year, setYear] = useState(initialYear ?? new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(initialMonth ?? 1)
  const [months, setMonths] = useState<number[]>([])
  const [planYears, setPlanYears] = useState<number[]>([])
  const [courses, setCourses] = useState<CursoPlan[]>([])
  const [loadedYear, setLoadedYear] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startOpen, setStartOpen] = useState(false)
  const [fijos, setFijos] = useState<CursoFijo[]>([])
  const [courseDialog, setCourseDialog] = useState<CursoPlan | "new" | null>(null)
  const [progressCourse, setProgressCourse] = useState<CursoSeguimiento | null>(null)
  const [metricsCourse, setMetricsCourse] = useState<CursoPlan | null>(null)
  const catalogo = useCatalogoCursos()

  // Los años con plan no dependen del año visible: una sola consulta por visita.
  useEffect(() => {
    let active = true
    cargarCursosFijos().then(lista => {
      if (active) setFijos(lista)
    }).catch(() => {
      // Sin la lista, el plan se muestra en su orden capturado.
    })
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
  // Los cursos fijos van primero en cada mes, en el orden de su lista.
  const visibleCourses = ordenarCursosMes(courses.filter(course => course.mes === selectedMonth), fijos)
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
    // Cada mes nuevo trae sus cursos fijos.
    const agregados = await completarCursosFijos(year, [month], courses, fijos)
    if (agregados.length) setCourses(current => [...current, ...agregados])
    setPlanYears(current => current.includes(year) ? current : [...current, year])
    setSelectedMonth(month)
    setStartOpen(false)
    notify.success(`${MESES[month - 1]} listo para capturar cursos`)
  }

  async function handleSave(data: DatosCurso) {
    const editing = courseDialog && courseDialog !== "new" ? courseDialog : null
    if (visibleCourses.some(course => course.course_id === data.course_id && course.id !== editing?.id)) {
      throw new Error(`Ese curso ya está en ${MESES[selectedMonth - 1]}.`)
    }
    const nextOrder = Math.max(0, ...visibleCourses.map(course => course.orden)) + 1
    upsertCourse(await guardarCurso(year, selectedMonth, nextOrder, data, courseDialog && courseDialog !== "new" ? courseDialog : undefined))
    setCourseDialog(null)
    notify.success("Curso guardado")
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
    <div className="space-y-6 dense:space-y-4">
      {/* Una sola fila en escritorio: filtros a la izquierda y acciones a la derecha; en móvil salta de línea sin desbordar. */}
      <div className="@container">
        <div className="flex flex-wrap items-center gap-2">
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
          {ready && (
            <TooltipProvider delayDuration={300}>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {/* Imprime el año completo; lo puede hacer quien consulta el plan. */}
                <ToolbarAction icon={Printer} label="Imprimir" disabled={courses.length === 0} onClick={() => window.print()} />
                {canEdit && <ToolbarAction icon={Pin} label="Cursos fijos" href={rutaCursosFijos(year)} />}
                {canEdit && <ToolbarAction icon={FileInput} label="Importar DNC" href={rutaImportarDnc(year)} />}
                {canEdit && monthStarted && <ToolbarAction icon={Plus} label="Agregar curso" onClick={() => openCourseDialog("new")} />}
                {canEdit && availableMonths.length > 0 && <ToolbarAction icon={CalendarPlus} label="Iniciar mes" variant="default" onClick={() => setStartOpen(true)} />}
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

      {ready && <PlanAnualPrint anio={year} meses={months} cursos={courses} fijos={fijos} />}

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
