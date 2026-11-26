/**
 * Carga masiva de cursos tomados.
 * Formato: [{ "numero": "1582", "curso": "Inducción", "fecha": "DD/MM/AAAA", "calificación": "9" }].
 * Los nombres de curso se resuelven contra el catálogo (exacto, alias o aproximado) y
 * lo que no coincide se revisa en pantalla antes de guardar.
 */

import { supabase } from "@/lib/supabase/client"
import { fetchAllRows } from "@/lib/supabase/fetchAll"
import { normalizeCourseName, type CourseMatch } from "@/lib/hooks/useCapacitacion"
import { crearListaErrores, leerFechaDMY, leerListaJson, leerTexto } from "@/lib/plantilla/json-import"

const CALIFICACION_MAX = 10
const CHUNK_SIZE = 200

export interface FilaCurso {
  numero: string
  curso: string
  /** "AAAA-MM-DD" */
  fecha: string
  /** 0 a 10 con hasta dos decimales; null si la fila no trae calificación. */
  calificacion: number | null
}

export interface CursosArchivo {
  filas: FilaCurso[]
  /** Filas leídas del archivo. */
  total: number
  /** Filas del mismo empleado y curso: se conserva la última. */
  repetidas: number
  errores: string[]
}

function leerCalificacion(value: unknown): number | null | undefined {
  const texto = leerTexto(value)
  if (texto === "") return null
  // Acepta punto o coma decimal, hasta dos decimales (la columna es numeric(5, 2)).
  if (!/^\d+([.,]\d{1,2})?$/.test(texto)) return undefined
  const calificacion = Number(texto.replace(",", "."))
  return calificacion <= CALIFICACION_MAX ? calificacion : undefined
}

export function leerCursosJson(texto: string): CursosArchivo {
  const lectura = leerListaJson(texto)
  if ("error" in lectura) return { filas: [], total: 0, repetidas: 0, errores: [lectura.error] }

  const errores = crearListaErrores()
  const porEmpleadoCurso = new Map<string, FilaCurso>()
  let repetidas = 0

  lectura.filas.forEach((registro, index) => {
    const numero = leerTexto(registro.numero)
    const curso = leerTexto(registro.curso)
    const fecha = leerFechaDMY(registro.fecha)
    const calificacion = leerCalificacion(registro["calificación"] ?? registro.calificacion)
    if (!numero) return errores.agregar(index + 1, "falta el número de empleado")
    if (!curso) return errores.agregar(index + 1, "falta el nombre del curso")
    if (!fecha) return errores.agregar(index + 1, "la fecha debe ser DD/MM/AAAA y existir")
    if (calificacion === undefined) return errores.agregar(index + 1, "la calificación debe ir de 0 a 10, con hasta dos decimales")

    const clave = `${numero}|${normalizeCourseName(curso)}`
    if (porEmpleadoCurso.has(clave)) repetidas++
    porEmpleadoCurso.set(clave, { numero, curso, fecha, calificacion })
  })

  return { filas: [...porEmpleadoCurso.values()], total: lectura.filas.length, repetidas, errores: errores.lista() }
}

interface ExistingRow { id: string; employee_id: string; course_id: string | null; raw_course_name: string }

interface CursoGuardado {
  employee_id: string
  course_id: string | null
  raw_course_name: string
  fecha_aplicacion: string
  calificacion: number | null
}

/**
 * Guarda las filas: crea los cursos nuevos, recuerda los alias confirmados y
 * actualiza el curso si el empleado ya lo tenía (por curso del catálogo o por nombre).
 */
export async function guardarCursos(
  filas: FilaCurso[],
  empleadoId: ReadonlyMap<string, string>,
  matches: CourseMatch[],
): Promise<{ insertados: number; actualizados: number }> {
  const porNombre = new Map(matches.map(match => [match.rawName, { ...match }]))

  const nuevos = matches.filter(match => match.createNew)
  if (nuevos.length > 0) {
    const { data, error } = await supabase
      .from("courses")
      .upsert(nuevos.map(match => ({ name: match.rawName })), { onConflict: "name" })
      .select("id, name")
    if (error) throw error
    for (const course of data ?? []) {
      const match = porNombre.get(course.name)
      if (match) match.resolvedCourseId = course.id
    }
  }

  const aliases = matches
    .filter(match => !match.createNew && match.resolvedCourseId && match.status !== "exact")
    .map(match => ({ alias: match.normalizedName, course_id: match.resolvedCourseId! }))
  if (aliases.length > 0) {
    const { error } = await supabase.from("course_aliases").upsert(aliases, { onConflict: "alias", ignoreDuplicates: true })
    if (error) throw error
  }

  const ids = [...new Set(filas.map(fila => empleadoId.get(fila.numero)).filter((id): id is string => Boolean(id)))]
  const existentes: ExistingRow[] = []
  for (let offset = 0; offset < ids.length; offset += CHUNK_SIZE) {
    const chunk = ids.slice(offset, offset + CHUNK_SIZE)
    existentes.push(...await fetchAllRows<ExistingRow>((from, to) =>
      supabase.from("employee_courses").select("id, employee_id, course_id, raw_course_name").in("employee_id", chunk).order("id").range(from, to)))
  }
  const porCurso = new Map(existentes.filter(row => row.course_id).map(row => [`${row.employee_id}|${row.course_id}`, row]))
  const porNombreRaw = new Map(existentes.map(row => [`${row.employee_id}|${normalizeCourseName(row.raw_course_name)}`, row]))

  // Por registro existente y por (empleado, curso): dos filas que caen en el mismo se quedan con la última.
  const actualizar = new Map<string, CursoGuardado & { id: string }>()
  const insertar = new Map<string, CursoGuardado>()
  for (const fila of filas) {
    const employeeId = empleadoId.get(fila.numero)
    if (!employeeId) continue
    const courseId = porNombre.get(fila.curso)?.resolvedCourseId ?? null
    const previo = (courseId && porCurso.get(`${employeeId}|${courseId}`)) || porNombreRaw.get(`${employeeId}|${normalizeCourseName(fila.curso)}`)
    if (previo) {
      // Conserva el nombre original del registro para no chocar con la clave (empleado, nombre).
      actualizar.set(previo.id, {
        id: previo.id, employee_id: employeeId, course_id: courseId ?? previo.course_id, raw_course_name: previo.raw_course_name,
        fecha_aplicacion: fila.fecha, calificacion: fila.calificacion,
      })
    } else {
      insertar.set(`${employeeId}|${courseId ?? normalizeCourseName(fila.curso)}`, {
        employee_id: employeeId, course_id: courseId, raw_course_name: fila.curso,
        fecha_aplicacion: fila.fecha, calificacion: fila.calificacion,
      })
    }
  }

  if (actualizar.size > 0) {
    const { error } = await supabase.from("employee_courses").upsert([...actualizar.values()], { onConflict: "id" })
    if (error) throw error
  }
  if (insertar.size > 0) {
    const { error } = await supabase.from("employee_courses").insert([...insertar.values()])
    if (error) throw error
  }
  return { insertados: insertar.size, actualizados: actualizar.size }
}
