import { isPassingCourseGrade } from "@/lib/capacitacion/utils"

type Employee = { id: string; puesto: string | null }
type Position = { id: string; name: string }
type PositionCourse = { position_id: string; course_id: string }
type EmployeeCourse = {
  employee_id: string
  course_id: string | null
  calificacion: number | null
  fecha_aplicacion: string | null
}

export function empleadosAsignadosAlCurso<T extends Employee>(
  courseId: string,
  employees: T[],
  positions: Position[],
  positionCourses: PositionCourse[],
  employeeCourses: EmployeeCourse[],
) {
  const assignedIds = new Set(positionCourses.filter(row => row.course_id === courseId).map(row => row.position_id))
  const assignedNames = new Set(positions.filter(row => assignedIds.has(row.id)).map(row => row.name))
  const firstAttempt = new Map<string, EmployeeCourse>()
  for (const row of employeeCourses) {
    if (row.course_id === courseId && !firstAttempt.has(row.employee_id)) firstAttempt.set(row.employee_id, row)
  }

  return employees.filter(employee => assignedNames.has(employee.puesto ?? "")).map(employee => {
    const attempt = firstAttempt.get(employee.id)
    const calificacion = attempt?.calificacion ?? null
    const estado = calificacion == null ? "pendiente" : isPassingCourseGrade(calificacion) ? "aprobado" : "reprobado"
    return { ...employee, calificacion, fecha: attempt?.fecha_aplicacion ?? null, estado }
  })
}
