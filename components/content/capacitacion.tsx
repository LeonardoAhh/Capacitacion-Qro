"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Briefcase, BookOpen, BookUp, ClipboardList, FileUp, MessageSquareShare } from "lucide-react"
import { SectionNavLayout, type SectionNavItem } from "@/components/ui/section-nav-layout"
import { useCapacitacion, useNuevoIngreso, useRole } from "@/lib/hooks"
import type { Department, Position, Course, PositionCourse, Employee, EmployeeCourse, NuevoIngreso, NuevoIngresoUpdate } from "@/lib/hooks"
import { notify } from "@/lib/notify"

import { CapEditEmployeeDialog, type EditEmployeeForm } from "@/components/content/cap-edit-employee-dialog"
import { CapNewPositionDialog } from "@/components/content/cap-new-position-dialog"
import { CapNewCourseDialog } from "@/components/content/cap-new-course-dialog"
import { CapEditCourseDialog } from "@/components/content/cap-edit-course-dialog"

import { CapPositionsTab } from "@/components/content/cap-positions-tab"
import { CapCoursesTab } from "@/components/content/cap-courses-tab"
import { CapHistorialTab } from "@/components/content/cap-historial-tab"
import { IngresoAcciones } from "@/components/content/plantilla/ingreso-acciones"
import { SeguimientoIngresoDialog } from "@/components/content/plantilla/seguimiento-ingreso-dialog"
import { IngresosSharePage } from "@/components/content/IngresosSharePage"
import { CargarCursosPage } from "@/components/content/cargar-cursos-page"
import { IncidenciasBulkImport } from "@/components/content/incidencias-bulk-import"
import { PLANTILLA_PATH } from "@/components/content/plantilla-paths"

const TAB_STORAGE_KEY = "plantilla:tab"
type PlantillaTab = "historial" | "cursos" | "puestos" | "cargar-cursos" | "incidencias" | "compartir-pendientes"

const SECCIONES: readonly SectionNavItem<PlantillaTab>[] = [
  { id: "historial", label: "Empleados", icon: ClipboardList },
  { id: "cursos", label: "Cursos", icon: BookOpen },
  { id: "puestos", label: "Puestos", icon: Briefcase },
  { id: "cargar-cursos", label: "Cargar cursos", icon: BookUp },
  { id: "incidencias", label: "Incidencias", icon: FileUp },
  { id: "compartir-pendientes", label: "Pendientes", icon: MessageSquareShare },
]
/** Apartados que solo ve quien edita. */
const SOLO_EDICION: readonly PlantillaTab[] = ["cargar-cursos", "incidencias", "compartir-pendientes"]

function isPlantillaTab(value: string | null): value is PlantillaTab {
  return SECCIONES.some(seccion => seccion.id === value)
}

/** La URL dice el apartado (`?seccion=`); Empleados es la dirección sin parámetro. */
function hrefDeApartado(tab: PlantillaTab) {
  return tab === "historial" ? PLANTILLA_PATH : `${PLANTILLA_PATH}?seccion=${tab}`
}

export default function CapacitacionContent() {
  const { canEdit, isReadOnly, employeesOnly } = useRole()
  const [activeTab, setActiveTab] = useState<PlantillaTab>("historial")
  const {
    fetchDepartments, fetchPositions, fetchCourses,
    fetchAllPositionCourses, fetchAllEmployeeCourses,
    fetchEmployees,
    deleteEmployee, updateEmployee,

    createPosition, createCourse, updateCourse,
  } = useCapacitacion()
  const { saving: ingresoSaving, fetchAll: fetchIngresos, createRecord, updateRecord, deleteRecord } = useNuevoIngreso()

  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [ingresos, setIngresos] = useState<NuevoIngreso[]>([])
  const [seguimiento, setSeguimiento] = useState<NuevoIngreso | null>(null)
  const [empCourses, setEmpCourses] = useState<EmployeeCourse[]>([])
  const [positionCourses, setPositionCourses] = useState<PositionCourse[]>([])
  const [loadingPositions, setLoadingPositions] = useState(false)
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [loadingCourseDetails, setLoadingCourseDetails] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const employeesLoaded = useRef(false)
  const employeesLoadPromise = useRef<Promise<void> | null>(null)
  const positionsLoaded = useRef(false)
  const positionsLoadPromise = useRef<Promise<void> | null>(null)
  const coursesLoaded = useRef(false)
  const coursesTabDataLoaded = useRef(false)
  const coursesTabDataVersion = useRef(0)
  const coursesTabLoadPromise = useRef<Promise<void> | null>(null)

  const [newPosOpen, setNewPosOpen] = useState(false)
  const [newPosSaving, setNewPosSaving] = useState(false)
  const [newCourseOpen, setNewCourseOpen] = useState(false)
  const [newCourseSaving, setNewCourseSaving] = useState(false)
  const [editCourseOpen, setEditCourseOpen] = useState(false)
  const [editCourseTarget, setEditCourseTarget] = useState<Course | null>(null)
  const [editCourseSaving, setEditCourseSaving] = useState(false)

  const [editEmpOpen, setEditEmpOpen] = useState(false)
  const [editEmpTarget, setEditEmpTarget] = useState<Employee | null>(null)
  const [editEmpSaving, setEditEmpSaving] = useState(false)



  const loadCoursesData = useCallback(async () => {
    setLoadingCourses(true)
    try { setCourses(await fetchCourses()) }
    catch (err) { console.error("Error loading courses:", err); notify.error("No se pudieron cargar los cursos") }
    finally { setLoadingCourses(false) }
  }, [fetchCourses])

  const loadEmployees = useCallback((refresh = false) => {
    if (refresh) employeesLoaded.current = false
    if (employeesLoaded.current) return Promise.resolve()
    if (employeesLoadPromise.current) return employeesLoadPromise.current

    setLoadingEmployees(true)
    const loadPromise = (async () => {
      try {
        // Plantilla y el seguimiento de ingreso se muestran en la misma tabla.
        const [empleados, nuevos] = await Promise.all([fetchEmployees(), fetchIngresos()])
        setEmployees(empleados)
        setIngresos(nuevos)
        employeesLoaded.current = true
      } catch (err) {
        console.error("Error loading employees:", err instanceof Error ? err.message : JSON.stringify(err))
        notify.error("No se pudieron cargar los empleados")
      } finally {
        setLoadingEmployees(false)
        employeesLoadPromise.current = null
      }
    })()
    employeesLoadPromise.current = loadPromise
    return loadPromise
  }, [fetchEmployees, fetchIngresos])

  const ingresosPorNumero = useMemo(
    () => new Map(ingresos.flatMap(ingreso => ingreso.numero ? [[ingreso.numero, ingreso] as const] : [])),
    [ingresos],
  )
  const employeeNames = useMemo(
    () => Object.fromEntries(employees.flatMap(emp => emp.numero ? [[emp.numero, emp.nombre]] : [])),
    [employees],
  )

  const loadPositionData = useCallback((refresh = false) => {
    if (refresh) positionsLoaded.current = false
    if (positionsLoaded.current) return Promise.resolve()
    if (positionsLoadPromise.current) return positionsLoadPromise.current

    setLoadingPositions(true)
    const loadPromise = (async () => {
      try {
        const [depts, pos] = await Promise.all([fetchDepartments(), fetchPositions()])
        setDepartments(depts); setPositions(pos)
        positionsLoaded.current = true
      } catch (err) {
        console.error("Error loading positions:", err)
        notify.error("No se pudieron cargar los puestos")
      } finally {
        setLoadingPositions(false)
        positionsLoadPromise.current = null
      }
    })()
    positionsLoadPromise.current = loadPromise
    return loadPromise
  }, [fetchDepartments, fetchPositions])

  const invalidateCoursesTabData = useCallback(() => {
    coursesTabDataLoaded.current = false
    coursesTabDataVersion.current += 1
  }, [])

  const loadCoursesTabData = useCallback(() => {
    if (coursesTabDataLoaded.current) return Promise.resolve()
    if (coursesTabLoadPromise.current) return coursesTabLoadPromise.current

    const requestVersion = coursesTabDataVersion.current
    const loadPromise = (async () => {
      if (!coursesLoaded.current) setLoadingCourses(true)
      setLoadingCourseDetails(true)
      try {
        // 1. Catálogo de cursos primero (~200 filas): la tabla se muestra al instante.
        const employeesTask = loadEmployees()
        const positionsTask = loadPositionData()
        const courseData = await fetchCourses()
        if (requestVersion !== coursesTabDataVersion.current) return

        setCourses(courseData)
        coursesLoaded.current = true
        setLoadingCourses(false)

        // 2. Relación puestos-cursos e historial en paralelo sin bloquear la lista de cursos.
        const [, , positionCourseData, employeeCourseData] = await Promise.all([
          employeesTask,
          positionsTask,
          fetchAllPositionCourses(courseData),
          fetchAllEmployeeCourses(courseData),
        ])
        if (
          requestVersion !== coursesTabDataVersion.current ||
          !employeesLoaded.current ||
          !positionsLoaded.current
        ) return
        setPositionCourses(positionCourseData)
        setEmpCourses(employeeCourseData)
        coursesTabDataLoaded.current = true
      } catch (err) {
        console.error("Error loading course tab data:", err)
        notify.error("No se pudieron cargar los cursos")
      } finally {
        setLoadingCourses(false)
        setLoadingCourseDetails(false)
        coursesTabLoadPromise.current = null
      }
    })()

    coursesTabLoadPromise.current = loadPromise
    return loadPromise
  }, [fetchAllEmployeeCourses, fetchAllPositionCourses, fetchCourses, loadEmployees, loadPositionData])

  useEffect(() => {
    loadPositionData()
    loadEmployees()
    try {
      // Primero el apartado de la URL (enlaces directos); si no hay, el último que se abrió.
      const pedido = new URLSearchParams(window.location.search).get("seccion")
      const saved = isPlantillaTab(pedido) ? pedido : sessionStorage.getItem(TAB_STORAGE_KEY)
      if (isPlantillaTab(saved)) {
        setActiveTab(saved)
        if (saved === "cursos") void loadCoursesTabData()
      }
    } catch {
      // sessionStorage puede no estar disponible en contextos restringidos.
    }
  }, [loadCoursesTabData, loadEmployees, loadPositionData])

  const handleTabChange = useCallback(async (next: PlantillaTab) => {
    setActiveTab(next)
    window.history.replaceState(null, "", hrefDeApartado(next))
    try { sessionStorage.setItem(TAB_STORAGE_KEY, next) } catch { /* ignore */ }
    if (next === "cursos") {
      await loadCoursesTabData()
    }
  }, [loadCoursesTabData])

  const handleSaveNewPos = useCallback(async (name: string, departmentId: string) => {
    setNewPosSaving(true)
    const result = await createPosition(name, departmentId)
    setNewPosSaving(false)
    if (result.success) { setNewPosOpen(false); loadPositionData(true); notify.success('Puesto creado') }
    else notify.error(result.error ?? 'No se pudo crear el puesto')
  }, [createPosition, loadPositionData])

  const handleSaveNewCourse = useCallback(async (name: string, tipo: string, durationHours: number | null) => {
    setNewCourseSaving(true)
    const result = await createCourse(name, tipo, durationHours)
    setNewCourseSaving(false)
    if (result.success) { invalidateCoursesTabData(); setNewCourseOpen(false); loadCoursesData(); notify.success('Curso creado') }
    else notify.error(result.error ?? 'No se pudo crear el curso')
  }, [createCourse, invalidateCoursesTabData, loadCoursesData])

  const handleSaveEditCourse = useCallback(async (id: string, data: { name: string; tipo: string; duration_hours: number | null }) => {
    setEditCourseSaving(true)
    const result = await updateCourse(id, data)
    setEditCourseSaving(false)
    if (result.success) {
      invalidateCoursesTabData()
      setEditCourseOpen(false); setEditCourseTarget(null); loadCoursesData()
      notify.success('Curso actualizado')
    } else {
      notify.error(result.error ?? 'No se pudo actualizar el curso')
    }
  }, [invalidateCoursesTabData, updateCourse, loadCoursesData])

  const handleSaveEditEmp = useCallback(async (form: EditEmployeeForm) => {
    if (!editEmpTarget) return
    setEditEmpSaving(true)
    const result = await updateEmployee(editEmpTarget.id, {
      nombre: form.nombre.trim(),
      puesto: form.puesto || null, departamento: form.departamento || null,
      area: form.area || null, turno: form.turno || null,
      fecha_ingreso: form.fecha_ingreso || null, jefe_directo: form.jefe_directo || null,
      evaluacion_desempeno: form.evaluacion_desempeno.trim() || null,
    })
    setEditEmpSaving(false)
    if (result.success) {
      invalidateCoursesTabData()
      setEditEmpOpen(false); setEditEmpTarget(null); loadEmployees(true)
      if (result.aviso) notify.warning('Empleado actualizado', { description: result.aviso })
      else notify.success('Empleado actualizado')
    } else {
      notify.error(result.error ?? 'No se pudo actualizar')
    }
  }, [editEmpTarget, invalidateCoursesTabData, updateEmployee, loadEmployees])


  const handleDeleteEmployee = useCallback(async (emp: Employee) => {
    const ok = await notify.confirm({
      title: "Eliminar empleado",
      description: `Se eliminará a ${emp.nombre}, también su seguimiento de ingreso. Sus cursos se conservan en los indicadores. No se puede deshacer.`,
      confirmLabel: "Eliminar",
      tone: "destructive",
      requireInputText: "ELIMINAR",
    })
    if (!ok) return
    const result = await deleteEmployee(emp.id, emp.numero)
    if (result.success) {
      invalidateCoursesTabData()
      setEmployees(prev => prev.filter(e => e.id !== emp.id))
      notify.success('Empleado eliminado')
    } else {
      notify.error(result.error ?? 'No se pudo eliminar')
    }
  }, [deleteEmployee, invalidateCoursesTabData])

  /** Alta única: Plantilla y seguimiento de ingreso (lib/hooks/useNuevoIngreso). */
  const handleCreateIngreso = useCallback(async (data: Omit<NuevoIngreso, "id" | "created_at" | "updated_at">) => {
    const result = await createRecord(data)
    if (result.success) { invalidateCoursesTabData(); void loadEmployees(true) }
    return result.success
  }, [createRecord, invalidateCoursesTabData, loadEmployees])

  const handleSaveSeguimiento = useCallback(async (id: string, updates: NuevoIngresoUpdate) => {
    const result = await updateRecord(id, updates)
    if (!result.success) return
    setSeguimiento(null)
    void loadEmployees(true)
  }, [updateRecord, loadEmployees])

  const handleRemoveSeguimiento = useCallback(async (ingreso: NuevoIngreso) => {
    const ok = await notify.confirm({
      title: "Quitar del seguimiento",
      description: `${ingreso.nombre} deja de mostrarse como nuevo ingreso. Seguirá en Plantilla.`,
      confirmLabel: "Quitar",
      tone: "destructive",
    })
    if (!ok) return
    const result = await deleteRecord(ingreso.id)
    if (!result.success) return
    setSeguimiento(null)
    setIngresos(prev => prev.filter(item => item.id !== ingreso.id))
  }, [deleteRecord])

  const secciones = canEdit ? SECCIONES : SECCIONES.filter(seccion => !SOLO_EDICION.includes(seccion.id))
  const currentTab: PlantillaTab = employeesOnly || !secciones.some(seccion => seccion.id === activeTab) ? "historial" : activeTab

  return (
    <>
      <SectionNavLayout
        label="Apartados de plantilla"
        items={secciones}
        value={currentTab}
        onValueChange={value => void handleTabChange(value)}
        showNav={!employeesOnly}
      >
        {currentTab === "compartir-pendientes" ? (
          <IngresosSharePage />
        ) : currentTab === "cargar-cursos" ? (
          <CargarCursosPage onSaved={invalidateCoursesTabData} />
        ) : currentTab === "incidencias" ? (
          <IncidenciasBulkImport
            employeeNames={employeeNames}
            loadingEmployees={loadingEmployees}
          />
        ) : currentTab === "puestos" ? (
          <CapPositionsTab
            departments={departments}
            positions={positions}
            loadingPositions={loadingPositions}
            isReadOnly={isReadOnly}
            onNewPosition={() => setNewPosOpen(true)}
          />
        ) : currentTab === "cursos" ? (
          <CapCoursesTab
            courses={courses}
            loadingCourses={loadingCourses || !coursesLoaded.current}
            loadingDetails={loadingCourseDetails}
            isReadOnly={isReadOnly}
            positions={positions}
            positionCourses={positionCourses}
            employees={employees}
            empCourses={empCourses}
            onNewCourse={() => setNewCourseOpen(true)}
            onEditCourse={(c) => { setEditCourseTarget(c); setEditCourseOpen(true) }}
          />
        ) : (
          <CapHistorialTab
            employees={employees}
            ingresos={ingresosPorNumero}
            loadingEmployees={loadingEmployees}
            canEdit={canEdit}
            acciones={canEdit ? <IngresoAcciones saving={ingresoSaving} onCreate={handleCreateIngreso} /> : undefined}
            onEditEmployee={(emp) => { setEditEmpTarget(emp); setEditEmpOpen(true) }}
            onDeleteEmployee={handleDeleteEmployee}
            onSeguimiento={setSeguimiento}
          />
        )}
      </SectionNavLayout>


      <SeguimientoIngresoDialog
        key={seguimiento?.id ?? "sin-seguimiento"}
        record={seguimiento}
        open={seguimiento !== null}
        saving={ingresoSaving}
        readOnly={!canEdit}
        onClose={() => setSeguimiento(null)}
        onSave={(id, updates) => void handleSaveSeguimiento(id, updates)}
        onRemove={ingreso => void handleRemoveSeguimiento(ingreso)}
      />

      <CapEditEmployeeDialog
        employee={editEmpTarget}
        open={editEmpOpen}
        saving={editEmpSaving}
        isReadOnly={isReadOnly}
        onClose={() => { setEditEmpOpen(false); setEditEmpTarget(null) }}
        onSave={handleSaveEditEmp}
      />



      <CapNewPositionDialog
        open={newPosOpen}
        saving={newPosSaving}
        departments={departments}
        onClose={() => setNewPosOpen(false)}
        onSave={handleSaveNewPos}
      />

      <CapNewCourseDialog
        open={newCourseOpen}
        saving={newCourseSaving}
        onClose={() => setNewCourseOpen(false)}
        onSave={handleSaveNewCourse}
      />

      <CapEditCourseDialog
        course={editCourseTarget}
        open={editCourseOpen}
        saving={editCourseSaving}
        onClose={() => { setEditCourseOpen(false); setEditCourseTarget(null) }}
        onSave={handleSaveEditCourse}
      />

    </>
  )
}
