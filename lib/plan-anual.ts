import { supabase } from "@/lib/supabase/client"
import { fetchAllRows } from "@/lib/supabase/fetchAll"

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const

export const PLAN_YEAR_MIN = 2000
export const PLAN_YEAR_MAX = 2100

export type TipoCurso = "interno" | "externo"

export interface CursoCatalogo {
  id: string
  name: string
}

export interface CursoPlan {
  id: string
  anio: number
  mes: number
  orden: number
  nombre: string
  course_id: string | null
  course: { name: string } | { name: string }[] | null
  area_solicitante: string
  aplica_para: string
  tipo: TipoCurso
  impartido: boolean
  fechas_imparticion: string[]
  reprogramado: boolean
  fecha_reprogramada: string | null
  motivo_reprogramacion: string | null
}

/** El listado ya trae el seguimiento completo de cada curso. */
export type CursoSeguimiento = CursoPlan

export type DatosCurso = Pick<CursoPlan, "nombre" | "course_id" | "area_solicitante" | "aplica_para" | "tipo">
export type DatosSeguimiento = Pick<CursoSeguimiento,
  "reprogramado" | "fecha_reprogramada" | "motivo_reprogramacion" | "impartido" | "fechas_imparticion">

export function nombreCursoPlan(curso: CursoPlan): string {
  const relation = curso.course
  return (Array.isArray(relation) ? relation[0]?.name : relation?.name) ?? curso.nombre
}

const CURSO_COLUMNS = "id,anio,mes,orden,nombre,course_id,course:courses(name),area_solicitante,aplica_para,tipo,reprogramado,fecha_reprogramada,motivo_reprogramacion,impartido,fechas_imparticion"

export async function cargarCatalogoCursos(): Promise<CursoCatalogo[]> {
  const cursos = await fetchAllRows<CursoCatalogo>("courses", "id,name")
  return cursos.sort((a, b) => a.name.localeCompare(b.name, "es"))
}

/** Años con meses iniciados; solo cambia al iniciar un mes, por eso se carga una vez. */
export async function cargarAniosPlan(): Promise<number[]> {
  const anios = await fetchAllRows<{ anio: number }>((from, to) => supabase.from("plan_anual_meses")
    .select("anio").order("anio").order("mes").range(from, to))
  return [...new Set(anios.map(row => Number(row.anio)))]
}

/** Meses y cursos de un año; los cursos ya incluyen su seguimiento para abrirlo sin otra consulta. */
export async function cargarPlan(anio: number): Promise<{ meses: number[]; cursos: CursoPlan[] }> {
  const [mesesResult, cursosResult] = await Promise.all([
    supabase.from("plan_anual_meses").select("mes").eq("anio", anio).order("mes"),
    supabase.from("plan_anual_cursos").select(CURSO_COLUMNS)
      .eq("anio", anio).order("mes").order("orden").order("created_at"),
  ])
  if (mesesResult.error) throw mesesResult.error
  if (cursosResult.error) throw cursosResult.error
  return {
    meses: (mesesResult.data ?? []).map(row => Number(row.mes)),
    cursos: (cursosResult.data ?? []) as unknown as CursoPlan[],
  }
}

export async function iniciarMes(anio: number, mes: number): Promise<void> {
  const { error } = await supabase.from("plan_anual_meses").insert({ anio, mes })
  if (error) throw error
}

/**
 * Crea o actualiza y devuelve la fila guardada. Para altas, `orden` lo calcula
 * quien llama a partir de los cursos del mes que ya tiene cargados.
 */
export async function guardarCurso(anio: number, mes: number, orden: number, datos: DatosCurso, curso?: CursoPlan): Promise<CursoPlan> {
  const values = {
    course_id: datos.course_id,
    nombre: datos.nombre.trim(),
    area_solicitante: datos.area_solicitante.trim(),
    aplica_para: datos.aplica_para.trim(),
    tipo: datos.tipo,
  }
  const table = supabase.from("plan_anual_cursos")
  const { data, error } = curso
    ? await table.update({ ...values, updated_at: new Date().toISOString() }).eq("id", curso.id).select(CURSO_COLUMNS).single()
    : await table.insert({ anio, mes, orden, ...values }).select(CURSO_COLUMNS).single()
  if (error) throw error
  return data as unknown as CursoPlan
}

export async function eliminarCurso(id: string): Promise<void> {
  const { error } = await supabase.from("plan_anual_cursos").delete().eq("id", id)
  if (error) throw error
}

export async function guardarSeguimiento(id: string, datos: DatosSeguimiento): Promise<CursoPlan> {
  const { data, error } = await supabase.from("plan_anual_cursos")
    .update({ ...datos, fecha_impartido: datos.fechas_imparticion[0] ?? null, updated_at: new Date().toISOString() })
    .eq("id", id).select(CURSO_COLUMNS).single()
  if (error) throw error
  return data as unknown as CursoPlan
}
