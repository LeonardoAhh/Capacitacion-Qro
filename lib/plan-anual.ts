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

/** Curso que se programa todos los meses; en el plan se lista antes que los demás. */
export interface CursoFijo {
  course_id: string
  orden: number
  area_solicitante: string
  aplica_para: string
  tipo: TipoCurso
}

export async function cargarCursosFijos(): Promise<CursoFijo[]> {
  const { data, error } = await supabase.from("plan_anual_cursos_fijos")
    .select("course_id,orden,area_solicitante,aplica_para,tipo").order("orden")
  if (error) throw error
  return (data ?? []) as CursoFijo[]
}

/** Reemplaza la lista completa; el orden es el de la lista recibida. */
export async function guardarCursosFijos(fijos: Omit<CursoFijo, "orden">[]): Promise<CursoFijo[]> {
  const { error: deleteError } = await supabase.from("plan_anual_cursos_fijos").delete().not("course_id", "is", null)
  if (deleteError) throw deleteError
  if (!fijos.length) return []
  const rows = fijos.map((fijo, orden) => ({ ...fijo, orden, area_solicitante: fijo.area_solicitante.trim(), aplica_para: fijo.aplica_para.trim() }))
  const { error } = await supabase.from("plan_anual_cursos_fijos").insert(rows)
  if (error) throw error
  return rows
}

/** Cursos de un mes en el orden del plan: primero los fijos (en su orden), luego los demás. */
export function ordenarCursosMes(cursos: CursoPlan[], fijos: CursoFijo[]): CursoPlan[] {
  const posicionFija = new Map(fijos.map(fijo => [fijo.course_id, fijo.orden]))
  const rango = (curso: CursoPlan) => curso.course_id && posicionFija.has(curso.course_id) ? 0 : 1
  return [...cursos].sort((left, right) => rango(left) - rango(right)
    || (posicionFija.get(left.course_id ?? "") ?? left.orden) - (posicionFija.get(right.course_id ?? "") ?? right.orden))
}

/**
 * Agrega a los meses indicados los cursos fijos que les falten. Nunca duplica: un curso
 * que ya está en el mes (fijo o capturado a mano) se respeta tal como está.
 */
export async function completarCursosFijos(anio: number, meses: number[], cursos: CursoPlan[], fijos: CursoFijo[]): Promise<CursoPlan[]> {
  const agregados: CursoPlan[] = []
  for (const mes of meses) {
    const delMes = cursos.filter(curso => curso.anio === anio && curso.mes === mes)
    const presentes = new Set(delMes.map(curso => curso.course_id))
    let orden = Math.max(0, ...delMes.map(curso => curso.orden))
    for (const fijo of fijos) {
      if (presentes.has(fijo.course_id)) continue
      orden += 1
      // El nombre lo toma el trigger de la tabla desde el catálogo (plan_anual_sync_course_name).
      agregados.push(await guardarCurso(anio, mes, orden, {
        course_id: fijo.course_id, nombre: "", area_solicitante: fijo.area_solicitante, aplica_para: fijo.aplica_para, tipo: fijo.tipo,
      }))
    }
  }
  return agregados
}

/** Firmas del plan anual impreso: puesto que elabora y puesto que autoriza. */
export const FIRMAS_PLAN = [
  { rol: "ELABORÓ", puesto: "ANALISTA DE CAPACITACIÓN" },
  { rol: "AUTORIZÓ", puesto: "JEFE DE RECURSOS HUMANOS" },
] as const

/** Nombre de quien ocupa cada puesto de firma según Plantilla; vacío si el puesto no tiene a nadie. */
export async function cargarFirmantesPlan(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("employees")
    .select("nombre,puesto").in("puesto", FIRMAS_PLAN.map(firma => firma.puesto)).order("nombre")
  if (error) throw error
  const nombres: Record<string, string> = {}
  for (const row of (data ?? []) as { nombre: string; puesto: string }[]) nombres[row.puesto] ??= row.nombre
  return nombres
}

export async function guardarSeguimiento(id: string, datos: DatosSeguimiento): Promise<CursoPlan> {
  const { data, error } = await supabase.from("plan_anual_cursos")
    .update({ ...datos, fecha_impartido: datos.fechas_imparticion[0] ?? null, updated_at: new Date().toISOString() })
    .eq("id", id).select(CURSO_COLUMNS).single()
  if (error) throw error
  return data as unknown as CursoPlan
}
