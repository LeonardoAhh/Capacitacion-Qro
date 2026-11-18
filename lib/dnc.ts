import { supabase } from "@/lib/supabase/client"
import { fetchAllRows } from "@/lib/supabase/fetchAll"
import { JEFES_DE_AREA_POR_DEPARTAMENTO, normalizeDepartamento } from "@/lib/catalogo"

export interface DncDepartment { id: string; name: string }
export interface DncCourse { id: string; name: string }
export interface DncPosition { id: string; name: string; department_id: string }

export interface DncReporte {
  id: string
  anio: number
  department_id: string
  department: { name: string } | { name: string }[] | null
  responsable_nombre: string | null
  fecha_elaboracion: string | null
  /** Última modificación del encabezado; respaldo de auditoría. */
  updated_at: string
}

export interface DncNecesidad {
  id: string
  reporte_id: string
  orden: number
  necesidad: string
  course_id: string | null
  curso_nombre: string
  position_ids: string[]
  funcion_actividad: string
  motivo: string
  beneficio: string
  mes_sugerido: number
  tipo: "interno" | "externo"
  /** NULL en necesidades capturadas antes de existir la autorización. */
  autorizacion: AutorizacionDnc | null
  motivo_no_autorizado: string | null
}

export type AutorizacionDnc = "autorizado" | "no_autorizado"

export type DatosNecesidad = Pick<DncNecesidad,
  "necesidad" | "course_id" | "position_ids" | "funcion_actividad" | "motivo" | "beneficio" | "mes_sugerido" | "tipo" | "autorizacion" | "motivo_no_autorizado">

export function nombreDepartamento(reporte: DncReporte): string {
  return (Array.isArray(reporte.department) ? reporte.department[0]?.name : reporte.department?.name) ?? "Departamento"
}

/** El DNC se captura, guarda y muestra en mayúsculas. */
export function aMayusculasDnc(texto: string): string {
  return texto.toLocaleUpperCase("es-MX")
}

/** Campos de texto libre de una necesidad (los que se normalizan a mayúsculas). */
export const CAMPOS_TEXTO_NECESIDAD = ["necesidad", "funcion_actividad", "motivo", "beneficio", "motivo_no_autorizado"] as const

/**
 * Responsables posibles del DNC de un departamento: su jefe registrado en el catálogo.
 * Si el departamento no está en el catálogo, se ofrecen todos los jefes.
 */
export function responsablesDnc(departamento: string): string[] {
  const objetivo = normalizeDepartamento(departamento)
  const propios = Object.entries(JEFES_DE_AREA_POR_DEPARTAMENTO)
    .find(([nombre]) => normalizeDepartamento(nombre) === objetivo)?.[1]
  if (propios?.length) return propios
  return [...new Set(Object.values(JEFES_DE_AREA_POR_DEPARTAMENTO).flat())]
    .sort((left, right) => left.localeCompare(right, "es"))
}

/** Etiqueta corta cuando la necesidad aplica a todos los puestos del departamento. */
export function nombreEquipoDnc(departamento: string): string {
  return aMayusculasDnc(`Equipo de ${departamento}`)
}

const REPORTE_COLUMNS = "id,anio,department_id,department:departments(name),responsable_nombre,fecha_elaboracion,updated_at"
const NECESIDAD_COLUMNS = "id,reporte_id,orden,necesidad,course_id,curso_nombre,funcion_actividad,motivo,beneficio,mes_sugerido,tipo,autorizacion,motivo_no_autorizado,puestos:dnc_necesidad_puestos(position_id)"

type NecesidadRow = Omit<DncNecesidad, "position_ids"> & {
  puestos: { position_id: string }[] | null
  /** Solo presente cuando se filtra por año con el join al reporte. */
  dnc_reportes?: unknown
}

function toNecesidad(row: NecesidadRow): DncNecesidad {
  const { puestos, dnc_reportes: reporte, ...need } = row
  void reporte
  return { ...need, position_ids: (puestos ?? []).map(link => link.position_id) }
}

export function ordenarReportes(reportes: DncReporte[]): DncReporte[] {
  return [...reportes].sort((left, right) => nombreDepartamento(left).localeCompare(nombreDepartamento(right), "es"))
}

/** Catálogos que no dependen del año; se cargan una sola vez por visita. */
export async function cargarCatalogosDnc(): Promise<{
  departamentos: DncDepartment[]
  puestos: DncPosition[]
  anios: number[]
}> {
  const [departamentos, puestos, anios] = await Promise.all([
    fetchAllRows<DncDepartment>((from, to) => supabase.from("departments")
      .select("id,name").order("name").range(from, to)),
    fetchAllRows<DncPosition>((from, to) => supabase.from("positions")
      .select("id,name,department_id").order("name").range(from, to)),
    fetchAllRows<{ anio: number }>((from, to) => supabase.from("dnc_reportes")
      .select("anio").order("anio").order("id").range(from, to)),
  ])
  return { departamentos, puestos, anios: [...new Set(anios.map(row => Number(row.anio)))] }
}

/** Reportes y necesidades (con sus puestos) de un año, en dos consultas paralelas. */
export async function cargarAnioDnc(anio: number): Promise<{ reportes: DncReporte[]; necesidades: DncNecesidad[] }> {
  const [reportes, necesidades] = await Promise.all([
    fetchAllRows<DncReporte>((from, to) => supabase.from("dnc_reportes")
      .select(REPORTE_COLUMNS).eq("anio", anio).order("department_id").range(from, to)),
    fetchAllRows<NecesidadRow>((from, to) => supabase.from("dnc_necesidades")
      .select(`${NECESIDAD_COLUMNS},dnc_reportes!inner(anio)`)
      .eq("dnc_reportes.anio", anio).order("orden").order("id").range(from, to)),
  ])
  return { reportes: ordenarReportes(reportes), necesidades: necesidades.map(toNecesidad) }
}

export async function crearReporteDnc(anio: number, departmentId: string): Promise<DncReporte> {
  const { data, error } = await supabase.from("dnc_reportes")
    .insert({ anio, department_id: departmentId }).select(REPORTE_COLUMNS).single()
  if (error) throw error
  return data as DncReporte
}

export type CambiosEncabezadoDnc = Partial<Pick<DncReporte, "responsable_nombre" | "fecha_elaboracion">>

/** Guarda solo los campos del encabezado que cambiaron y devuelve la fecha de modificación registrada. */
export async function guardarEncabezadoDnc(id: string, cambios: CambiosEncabezadoDnc): Promise<string> {
  const { data, error } = await supabase.from("dnc_reportes")
    .update({ ...cambios, updated_at: new Date().toISOString() }).eq("id", id).select("updated_at").single()
  if (error) throw error
  return (data as { updated_at: string }).updated_at
}

/** Guarda por RPC y devuelve la fila resultante (orden y nombre los asigna la BD). */
export async function guardarNecesidadDnc(reporteId: string, datos: DatosNecesidad, actual?: DncNecesidad): Promise<DncNecesidad> {
  const { data: id, error } = await supabase.rpc("dnc_guardar_necesidad", {
    p_id: actual?.id ?? null,
    p_reporte_id: reporteId,
    p_course_id: datos.course_id,
    p_position_ids: datos.position_ids,
    p_necesidad: aMayusculasDnc(datos.necesidad.trim()),
    p_funcion_actividad: aMayusculasDnc(datos.funcion_actividad.trim()),
    p_motivo: aMayusculasDnc(datos.motivo.trim()),
    p_beneficio: aMayusculasDnc(datos.beneficio.trim()),
    p_mes_sugerido: datos.mes_sugerido,
    p_tipo: datos.tipo,
    p_autorizacion: datos.autorizacion,
    p_motivo_no_autorizado: datos.autorizacion === "no_autorizado"
      ? aMayusculasDnc((datos.motivo_no_autorizado ?? "").trim())
      : null,
  })
  if (error) throw error
  const { data, error: readError } = await supabase.from("dnc_necesidades")
    .select(NECESIDAD_COLUMNS).eq("id", id as string).single()
  if (readError) throw readError
  return toNecesidad(data as NecesidadRow)
}

export async function eliminarNecesidadDnc(id: string): Promise<void> {
  const { error } = await supabase.from("dnc_necesidades").delete().eq("id", id)
  if (error) throw error
}
