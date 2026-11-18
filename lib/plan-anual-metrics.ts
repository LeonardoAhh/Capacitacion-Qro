import { empleadosAsignadosAlCurso } from "@/lib/capacitacion/course-metrics"
import { supabase } from "@/lib/supabase/client"
import { fetchAllRows } from "@/lib/supabase/fetchAll"

type PositionCourseRow = { position_id: string; course_id: string }
type PositionRow = { id: string; name: string }
type EmployeeRow = { id: string; puesto: string | null }
type EmployeeCourseRow = {
  employee_id: string
  course_id: string | null
  calificacion: number | null
  fecha_aplicacion: string | null
}

export interface CourseMetrics {
  pendientes: number
  asistentes: number
}

export async function cargarMetricasCurso(courseId: string, anio: number, mes: number, fechasImparticion: string[]): Promise<CourseMetrics> {
  const positionCourses = await fetchAllRows<PositionCourseRow>((from, to) =>
    supabase.from("position_courses").select("position_id,course_id")
      .eq("course_id", courseId).order("position_id").range(from, to))

  if (positionCourses.length === 0) return { pendientes: 0, asistentes: 0 }

  const positionIds = [...new Set(positionCourses.map(row => row.position_id))]
  const positions = await fetchAllRows<PositionRow>((from, to) =>
    supabase.from("positions").select("id,name")
      .in("id", positionIds).order("id").range(from, to))

  if (positions.length === 0) return { pendientes: 0, asistentes: 0 }

  const positionNames = [...new Set(positions.map(row => row.name))]
  const [employees, attempts] = await Promise.all([
    fetchAllRows<EmployeeRow>((from, to) => supabase.from("employees").select("id,puesto")
      .in("puesto", positionNames).order("id").range(from, to)),
    fetchAllRows<EmployeeCourseRow>((from, to) => supabase.from("employee_courses")
      .select("employee_id,course_id,calificacion,fecha_aplicacion")
      .eq("course_id", courseId).order("id").range(from, to)),
  ])

  const assigned = empleadosAsignadosAlCurso(courseId, employees, positions, positionCourses, attempts)
  const attended = new Set(attempts.filter(attempt => attempt.fecha_aplicacion != null).map(attempt => attempt.employee_id))
  const monthPrefix = `${anio}-${String(mes).padStart(2, "0")}-`
  const extraDates = new Set(fechasImparticion)
  const attendedInPeriod = new Set(attempts.filter(attempt =>
    attempt.fecha_aplicacion?.startsWith(monthPrefix) ||
    (attempt.fecha_aplicacion != null && extraDates.has(attempt.fecha_aplicacion)),
  ).map(attempt => attempt.employee_id))
  return {
    pendientes: assigned.filter(employee => !attended.has(employee.id)).length,
    asistentes: assigned.filter(employee => attendedInPeriod.has(employee.id)).length,
  }
}
