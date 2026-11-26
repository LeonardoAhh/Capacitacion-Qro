"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Briefcase, BookOpen, ClipboardList } from "lucide-react"
import { SectionNavLayout, type SectionNavItem } from "@/components/ui/section-nav-layout"
import { useCapacitacion, useRole } from "@/lib/hooks"
import type { Department, Position, Course, PositionCourse, Employee, EmployeeCourse } from "@/lib/hooks"
import { notify } from "@/lib/notify"

import { CapEditEmployeeDialog, type EditEmployeeForm } from "@/components/content/cap-edit-employee-dialog"
import { CapNewEmployeeDialog } from "@/components/redesign/cap-new-employee-dialog"
import { CapNewPositionDialog } from "@/components/content/cap-new-position-dialog"
import { CapNewCourseDialog } from "@/components/content/cap-new-course-dialog"
import { CapEditCourseDialog } from "@/components/content/cap-edit-course-dialog"

import { CapPositionsTab } from "@/components/content/cap-positions-tab"
import { CapCoursesTab } from "@/components/content/cap-courses-tab"
import { CapHistorialTab } from "@/components/content/cap-historial-tab"

const TAB_STORAGE_KEY = "plantilla:tab"
type PlantillaTab = "historial" | "cursos" | "puestos"

const SECCIONES: readonly SectionNavItem<PlantillaTab>[] = [
  { id: "historial", label: "Empleados", icon: ClipboardList },
  { id: "cursos", label: "Cursos", icon: BookOpen },
  { id: "puestos", label: "Puestos", icon: Briefcase },
]

function isPlantillaTab(value: string | null): value is PlantillaTab {
  return value === "historial" || value === "cursos" || value === "puestos"
}

export default function CapacitacionContent() {
  const { canEdit, isReadOnly, employeesOnly } = useRole()
  const [activeTab, setActiveTab] = useState<PlantillaTab>("historial")
  const {
    fetchDepartments, fetchPositions, fetchCourses,
    fetchAllPositionCourses, fetchAllEmployeeCourses,
    fetchEmployees,
    deleteEmployee, createEmployeeManual, updateEmployee,

    createPosition, createCourse, updateCourse,
  } = useCapacitacion()

  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
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

  const [newEmpOpen, setNewEmpOpen] = useState(false)
  const [newEmpSaving, setNewEmpSaving] = useState(false)
  const [newEmpSuccess, setNewEmpSuccess] = useState(false)


  const loadCoursesData = useCallback(async () => {
    setLoadingCourses(true)
    try { setCourses(await fetchCourses()) }
    catch (err) { console.error("Error loading courses:", err); notify.error("Error al cargar cursos") }
    finally { setLoadingCourses(false) }
  }, [fetchCourses])

  const loadEmployees = useCallback((refresh = false) => {
    if (refresh) employeesLoaded.current = false
    if (employeesLoaded.current) return Promise.resolve()
    if (employeesLoadPromise.current) return employeesLoadPromise.current

    setLoadingEmployees(true)
    const loadPromise = (async () => {
      try {
        setEmployees(await fetchEmployees())
        employeesLoaded.current = true
      } catch (err) {
        console.error("Error loading employees:", err instanceof Error ? err.message : JSON.stringify(err))
        notify.error("Error al cargar empleados")
      } finally {
        setLoadingEmployees(false)
        employeesLoadPromise.current = null
      }
    })()
    employeesLoadPromise.current = loadPromise
    return loadPromise
  }, [fetchEmployees])

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
        notify.error("Error al cargar puestos")
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
        notify.error("Error al cargar los datos de cursos")
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
      const saved = sessionStorage.getItem(TAB_STORAGE_KEY)
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
    try { sessionStorage.setItem(TAB_STORAGE_KEY, next) } catch { /* ignore */ }
    if (next === "cursos") {
      await loadCoursesTabData()
    }
  }, [loadCoursesTabData])

  const handleSaveNewPos = useCallback(async (name: string, departmentId: string) => {
    setNewPosSaving(true)
    const result = await createPosition(name, departmentId)
    setNewPosSaving(false)
    if (result.success) { setNewPosOpen(false); loadPositionData(true); notify.success('Puesto creado correctamente') }
    else notify.error(result.error ?? 'Error al crear puesto')
  }, [createPosition, loadPositionData])

  const handleSaveNewCourse = useCallback(async (name: string, tipo: string, durationHours: number | null) => {
    setNewCourseSaving(true)
    const result = await createCourse(name, tipo, durationHours)
    setNewCourseSaving(false)
    if (result.success) { invalidateCoursesTabData(); setNewCourseOpen(false); loadCoursesData(); notify.success('Curso creado correctamente') }
    else notify.error(result.error ?? 'Error al crear curso')
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
      notify.error(result.error ?? 'Error al actualizar curso')
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
      notify.success('Empleado actualizado')
    } else {
      notify.error(result.error ?? 'Error al actualizar')
    }
  }, [editEmpTarget, invalidateCoursesTabData, updateEmployee, loadEmployees])

  const handleSaveNewEmp = useCallback(async (
    emp: { numero: string; nombre: string; puesto: string; departamento: string; area: string; turno: string; fecha_ingreso: string; jefe_directo: string; evaluacion_desempeno: string },
  ) => {
    setNewEmpSaving(true)
    const result = await createEmployeeManual(
      {
        numero: emp.numero.trim() || null, nombre: emp.nombre.trim(),
        puesto: emp.puesto || null, departamento: emp.departamento || null,
        area: emp.area || null, turno: emp.turno || null,
        fecha_ingreso: emp.fecha_ingreso || null, jefe_directo: emp.jefe_directo || null,
        evaluacion_desempeno: emp.evaluacion_desempeno.trim() || null,
      },
      []
    )
    setNewEmpSaving(false)
    if (result.success) { invalidateCoursesTabData(); setNewEmpOpen(false); setNewEmpSuccess(true); loadEmployees(true); notify.success('Empleado creado') }
    else notify.error(result.error ?? 'Error al crear empleado')
  }, [createEmployeeManual, invalidateCoursesTabData, loadEmployees])

  const handleDeleteEmployee = useCallback(async (emp: Employee) => {
    const ok = await notify.confirm({
      title: "Eliminar empleado",
      description: `Se eliminará a ${emp.nombre} de la plantilla. Sus cursos tomados se conservan en los indicadores de capacitación. Esta acción no se puede deshacer.`,
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
      notify.error(result.error ?? 'Error al eliminar')
    }
  }, [deleteEmployee, invalidateCoursesTabData])

  const currentTab: PlantillaTab = employeesOnly ? "historial" : activeTab

  return (
    <>
      <SectionNavLayout
        label="Apartados de plantilla"
        items={SECCIONES}
        value={currentTab}
        onValueChange={value => void handleTabChange(value)}
        showNav={!employeesOnly}
      >
        {currentTab === "puestos" ? (
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
            loadingEmployees={loadingEmployees}
            canEdit={canEdit}
            newEmpSuccess={newEmpSuccess}
            onNewEmployee={() => { setNewEmpSuccess(false); setNewEmpOpen(true) }}
            onEditEmployee={(emp) => { setEditEmpTarget(emp); setEditEmpOpen(true) }}
            onDeleteEmployee={handleDeleteEmployee}
          />
        )}
      </SectionNavLayout>


      <CapNewEmployeeDialog
        open={newEmpOpen}
        saving={newEmpSaving}
        isReadOnly={isReadOnly}
        onClose={() => setNewEmpOpen(false)}
        onSave={handleSaveNewEmp}
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
