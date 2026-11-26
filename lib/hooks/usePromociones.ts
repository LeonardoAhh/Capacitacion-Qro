"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import { notify } from "@/lib/notify"
import type { ConfirmarPromocionInput, ExamenPromocionInput } from "@/lib/promociones/types"
import type {
  EmpleadoPromocion,
  ReglaPromocion,
  CursoRequerido,
  EvaluacionDesempeño,
} from "@/lib/promociones/types"

const PAGE_SIZE = 1000
const MAX_CONCURRENT_PAGES = 6
const CACHE_TTL_MS = 60_000

let cachedEmpleados: EmpleadoPromocion[] | null = null
let cachedAt = 0
let inflightFetch: Promise<EmpleadoPromocion[]> | null = null
let authListenerRegistered = false

function invalidatePromocionesCache() {
  cachedEmpleados = null
  cachedAt = 0
  inflightFetch = null
}

function ensureAuthCacheInvalidation() {
  if (authListenerRegistered || typeof window === "undefined") return
  authListenerRegistered = true
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") invalidatePromocionesCache()
  })
}

/** Igual que useCapacitacion: mayúsculas, sin acentos, sin puntuación, trim */
function norm(s: string | null | undefined): string {
  return (s ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Trae todas las filas de una tabla en páginas de 1000.
 * La primera página pide el conteo exacto y, si hay más páginas, las descarga en paralelo.
 */
async function fetchAllRows<T>(
  buildQuery: (
    from: number,
    to: number,
    withCount: boolean,
  ) => PromiseLike<{ data: T[] | null; count?: number | null; error: unknown }>
): Promise<T[]> {
  const first = await buildQuery(0, PAGE_SIZE - 1, true)
  if (first.error) throw first.error
  const initialRows = first.data ?? []
  if (initialRows.length < PAGE_SIZE) return initialRows

  const total = first.count
  if (typeof total === "number" && total > PAGE_SIZE) {
    const ranges: Array<[number, number]> = []
    for (let from = PAGE_SIZE; from < total; from += PAGE_SIZE) {
      ranges.push([from, Math.min(from + PAGE_SIZE - 1, total - 1)])
    }
    const result = [...initialRows]
    for (let i = 0; i < ranges.length; i += MAX_CONCURRENT_PAGES) {
      const batch = ranges.slice(i, i + MAX_CONCURRENT_PAGES)
      const pages = await Promise.all(
        batch.map(async ([from, to]) => {
          const { data, error } = await buildQuery(from, to, false)
          if (error) throw error
          return data ?? []
        })
      )
      for (const page of pages) result.push(...page)
    }
    return result
  }

  const result = [...initialRows]
  let from = PAGE_SIZE
  while (true) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1, false)
    if (error) throw error
    if (!data || data.length === 0) break
    result.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return result
}

async function fetchPromocionesDataset(): Promise<EmpleadoPromocion[]> {
  const [
    employeesData,
    datosPromocionRes,
    reglasRes,
    positionsRes,
    coursesRes,
    posCourses,
    empCourses,
    evalsDesempeno,
  ] = await Promise.all([
    fetchAllRows<{
      id: string
      numero: string | null
      nombre: string
      puesto: string | null
      departamento: string | null
      area: string | null
      turno: string | null
      fecha_ingreso: string | null
    }>((from, to, withCount) =>
      supabase
        .from("employees")
        .select(
          "id, numero, nombre, puesto, departamento, area, turno, fecha_ingreso",
          withCount ? { count: "exact" } : undefined,
        )
        .order("nombre")
        .order("id")
        .range(from, to)
    ),
    supabase
      .from("datos_promocion")
      .select("*"),
    supabase
      .from("reglas_promocion")
      .select(
        "puesto, promocion_a, min_temporalidad_meses, min_calificacion_examen, min_calificacion_evaluacion, min_porcentaje_cursos",
      ),
    supabase.from("positions").select("id, name"),
    supabase.from("courses").select("id, name"),
    fetchAllRows<{
      position_id: string
      course_id: string
      order_index: number
    }>((from, to, withCount) =>
      supabase
        .from("position_courses")
        .select("position_id, course_id, order_index", withCount ? { count: "exact" } : undefined)
        .order("order_index")
        .order("id")
        .range(from, to)
    ),
    fetchAllRows<{
      employee_id: string | null
      course_id: string | null
      calificacion: number | null
      fecha_aplicacion: string | null
    }>((from, to, withCount) =>
      supabase
        .from("employee_courses")
        .select("employee_id, course_id, calificacion, fecha_aplicacion", withCount ? { count: "exact" } : undefined)
        .not("employee_id", "is", null)
        .not("course_id", "is", null)
        .order("id")
        .range(from, to)
    ),
    fetchAllRows<{
      numero_empleado: string | null
      periodo: string | null
      calificacion_final: number | null
      created_at: string
    }>((from, to, withCount) =>
      supabase
        .from("evaluaciones_desempeno")
        .select("numero_empleado, periodo, calificacion_final, created_at", withCount ? { count: "exact" } : undefined)
        .order("id")
        .range(from, to)
    ),
  ])

  if (datosPromocionRes.error) throw datosPromocionRes.error
  if (reglasRes.error) throw reglasRes.error
  if (positionsRes.error) throw positionsRes.error
  if (coursesRes.error) throw coursesRes.error

  if (!employeesData.length) return []

  const datosPromocion = datosPromocionRes.data ?? []
  const reglasData = reglasRes.data ?? []
  const positionsData = positionsRes.data ?? []
  const coursesData = coursesRes.data ?? []

  // Construir índices en una sola pasada por tabla.
  const datosMap = new Map<string, (typeof datosPromocion)[number]>()
  for (const d of datosPromocion) datosMap.set(String(d.numero), d)

  const reglaMap = new Map<string, ReglaPromocion>()
  for (const r of reglasData) {
    reglaMap.set(norm(r.puesto), {
      puesto:                    r.puesto,
      promocionA:                r.promocion_a ?? undefined,
      minTemporalidadMeses:      r.min_temporalidad_meses,
      minCalificacionExamen:     r.min_calificacion_examen ?? undefined,
      minCalificacionEvaluacion: r.min_calificacion_evaluacion,
      minPorcentajeCursos:       r.min_porcentaje_cursos,
    })
  }

  const courseNameMap = new Map<string, string>()
  for (const c of coursesData) courseNameMap.set(c.id, c.name)

  // Para cada nombre de posición, guardar el position_id con más cursos asignados.
  const posCourseCount = new Map<string, number>()
  type CourseRef = { course_id: string; name: string; orderIndex: number }
  const posCoursesMap = new Map<string, CourseRef[]>()

  for (const pc of posCourses) {
    posCourseCount.set(pc.position_id, (posCourseCount.get(pc.position_id) ?? 0) + 1)
    const courseName = courseNameMap.get(pc.course_id)
    if (!courseName) continue
    let list = posCoursesMap.get(pc.position_id)
    if (!list) {
      list = []
      posCoursesMap.set(pc.position_id, list)
    }
    list.push({
      course_id:  pc.course_id,
      name:       courseName,
      orderIndex: pc.order_index,
    })
  }

  for (const list of posCoursesMap.values()) {
    list.sort((a, b) => a.orderIndex - b.orderIndex)
  }

  const posFallMap = new Map<string, string>()
  for (const p of positionsData) {
    const key      = norm(p.name)
    const existing = posFallMap.get(key)
    const newCount = posCourseCount.get(p.id) ?? 0
    const oldCount = existing ? (posCourseCount.get(existing) ?? 0) : -1
    if (newCount > oldCount) posFallMap.set(key, p.id)
  }

  type TakenRow = { calificacion: number | null; fecha_aplicacion: string | null }
  const empCoursesMap = new Map<string, Map<string, TakenRow>>()
  for (const ec of empCourses) {
    if (!ec.employee_id || !ec.course_id) continue
    let takenMap = empCoursesMap.get(ec.employee_id)
    if (!takenMap) {
      takenMap = new Map()
      empCoursesMap.set(ec.employee_id, takenMap)
    }
    takenMap.set(ec.course_id, {
      calificacion:    ec.calificacion,
      fecha_aplicacion: ec.fecha_aplicacion,
    })
  }

  const evalsMap = new Map<string, EvaluacionDesempeño[]>()
  for (const ev of evalsDesempeno) {
    if (!ev.numero_empleado) continue
    let list = evalsMap.get(ev.numero_empleado)
    if (!list) {
      list = []
      evalsMap.set(ev.numero_empleado, list)
    }
    list.push({
      fecha: String(ev.created_at).split("T")[0],
      calificacion: Number(ev.calificacion_final),
      periodo: ev.periodo ? String(ev.periodo) : undefined,
    })
  }

  const todayIso = new Date().toISOString().split("T")[0]

  return employeesData.map((emp) => {
    const datos = emp.numero ? datosMap.get(String(emp.numero)) : undefined
    const normPuesto = emp.puesto ? norm(emp.puesto) : ""
    const regla = normPuesto ? reglaMap.get(normPuesto) : undefined
    const posId = normPuesto ? posFallMap.get(normPuesto) : undefined
    const requeridos = posId ? (posCoursesMap.get(posId) ?? []) : []
    const tomados = empCoursesMap.get(emp.id)

    const cursosRequeridos: CursoRequerido[] = requeridos.map(({ course_id, name }) => {
      const taken = tomados?.get(course_id)
      const cal   = taken?.calificacion ?? null
      return {
        nombre:          name,
        // Aprobado = mismo criterio que useCapacitacion: cal >= 7 o simplemente tomado
        completado:      taken != null && (cal == null || cal >= 7),
        fechaAplicacion: taken?.fecha_aplicacion ?? undefined,
        calificacion:    cal ?? undefined,
      }
    })

    const evaluaciones = emp.numero ? [...(evalsMap.get(String(emp.numero)) ?? [])] : []

    if (datos && datos.desempeño_actual != null) {
      evaluaciones.push({
        fecha: datos.updated_at ? String(datos.updated_at).split("T")[0] : todayIso,
        calificacion: Number(datos.desempeño_actual),
        periodo: datos.periodo_evaluacion ? String(datos.periodo_evaluacion) : undefined,
      })
    }

    return {
      id:               emp.id,
      numero:           emp.numero ?? undefined,
      nombre:           emp.nombre,
      puesto:           emp.puesto ?? "",
      departamento:     emp.departamento ?? "",
      area:             emp.area ?? undefined,
      turno:            emp.turno ?? undefined,
      fechaIngresoPuesto: String(datos?.fecha_inicio_puesto ?? emp.fecha_ingreso ?? ""),
      fechaExamenGuardada: datos?.fecha_examen ? String(datos.fecha_examen) : undefined,
      calificacionExamen: datos?.ultima_calificacion_examen != null
        ? Number(datos.ultima_calificacion_examen)
        : undefined,
      intentosExamen:   datos?.intentos_examen != null ? Number(datos.intentos_examen) : 0,
      cursosRequeridos,
      evaluaciones,
      regla,
    }
  })
}

async function loadPromociones(force = false): Promise<EmpleadoPromocion[]> {
  if (!force && inflightFetch) return inflightFetch
  const promise = fetchPromocionesDataset()
    .then((result) => {
      cachedEmpleados = result
      cachedAt = Date.now()
      return result
    })
    .finally(() => {
      if (inflightFetch === promise) inflightFetch = null
    })
  inflightFetch = promise
  return promise
}

export function usePromociones() {
  const [empleados, setEmpleados] = useState<EmpleadoPromocion[]>(() => cachedEmpleados ?? [])
  const [loading, setLoading] = useState(() => cachedEmpleados === null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    ensureAuthCacheInvalidation()
    return () => { mountedRef.current = false }
  }, [])

  const cargarDatos = useCallback(async (force = true) => {
    const hasCache = cachedEmpleados !== null
    if (!hasCache) setLoading(true)
    setError(null)
    try {
      const result = await loadPromociones(force)
      if (mountedRef.current) setEmpleados(result)
    } catch (err: unknown) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Error al cargar datos")
      }
      notify.error("Error al cargar promociones")
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const isFresh = cachedEmpleados !== null && Date.now() - cachedAt < CACHE_TTL_MS
    if (isFresh) {
      setEmpleados(cachedEmpleados!)
      setLoading(false)
      return
    }
    void cargarDatos(false)
  }, [cargarDatos])

  const recargar = useCallback(() => cargarDatos(true), [cargarDatos])

  const promoverEmpleado = useCallback(async (
    empleadoId: string,
    numero: string | undefined,
    nuevoPuesto: string,
    datos: ConfirmarPromocionInput,
  ): Promise<void> => {
    const { error: empErr } = await supabase
      .from("employees")
      .update({ puesto: nuevoPuesto })
      .eq("id", empleadoId)
    if (empErr) {
      notify.error("Error al promover empleado")
      throw new Error(empErr.message)
    }

    if (numero) {
      const { error: dpErr } = await supabase
        .from("datos_promocion")
        .upsert(
          {
            numero,
            fecha_inicio_puesto: datos.fechaInicio || null,
            // Reset the exam status for the new position to allow 3 fresh attempts
            fecha_examen: null,
            ultima_calificacion_examen: null,
            intentos_examen: 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "numero" }
        )
      if (dpErr) {
        notify.error("Error al guardar datos de promoción")
        throw new Error(dpErr.message)
      }
    }
    notify.success(`Empleado promovido a ${nuevoPuesto}`)
    await recargar()
  }, [recargar])

  const guardarExamen = useCallback(async (
    numero: string,
    datos: ExamenPromocionInput,
  ): Promise<void> => {
    const isNewAttempt = datos.calExamen != null && datos.nuevoIntento === true
    const baseIntentos = datos.intentosPrevios ?? 0
    const nextIntentos = isNewAttempt ? baseIntentos + 1 : baseIntentos

    const { error: dpErr } = await supabase
      .from("datos_promocion")
      .upsert(
        {
          numero,
          fecha_examen: datos.fechaExamen || null,
          ultima_calificacion_examen: datos.calExamen,
          intentos_examen: nextIntentos,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "numero" }
      )
    if (dpErr) {
      notify.error("Error al actualizar empleado")
      throw new Error(dpErr.message)
    }
    notify.success("Empleado actualizado")
    await recargar()
  }, [recargar])

  return { empleados, loading, error, recargar, promoverEmpleado, guardarExamen }
}
