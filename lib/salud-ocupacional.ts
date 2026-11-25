import { deISO, hoyISO, inicioMes, sumarDias, sumarMeses } from "@/lib/fechas"
import { Ambulance, BriefcaseMedical, HardHat, Hospital, type LucideIcon } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

/**
 * Accidentes en planta (Occupational Health), en la tabla occupational_accidents.
 * Solo dev y ehs la leen y gestionan (RLS).
 */

export type AtencionAccidente = "servicio_medico" | "clinica_particular" | "imss"

/** Largo máximo de "¿Qué ocurrió?" (igual que el CHECK de la tabla). */
export const DESCRIPCION_ACCIDENTE_MAX = 500

/** Días de incapacidad o de reposo: de 1 a 365 (igual que los CHECK de la tabla). */
export const DIAS_MAX = 365

export type Severidad = "alta" | "media" | "baja"

/** Severidad del accidente, de mayor a menor. */
export const SEVERIDADES: readonly { value: Severidad; label: string; dot: string }[] = [
  { value: "alta", label: "Alta", dot: "bg-destructive" },
  { value: "media", label: "Media", dot: "bg-chart-3" },
  { value: "baja", label: "Baja", dot: "bg-chart-1" },
]

/** Meta: como máximo un incidente por mes. */
export const META_INCIDENTES_MES = 1

/**
 * Dónde se atendió, de menor a mayor gravedad. Cada una con su color de la paleta
 * (tokens --chart-*): el día del calendario toma el de la atención más alta.
 */
export const ATENCIONES: readonly { value: AtencionAccidente; label: string; corto: string; icon: LucideIcon; text: string; dot: string; chip: string }[] = [
  { value: "servicio_medico", label: "Servicio médico de planta", corto: "Servicio médico", icon: BriefcaseMedical, text: "text-chart-2", dot: "bg-chart-2", chip: "border-chart-2/30 bg-chart-2/10 text-chart-2" },
  { value: "clinica_particular", label: "Clínica particular", corto: "Clínica", icon: Hospital, text: "text-chart-4", dot: "bg-chart-4", chip: "border-chart-4/30 bg-chart-4/10 text-chart-4" },
  { value: "imss", label: "IMSS", corto: "IMSS", icon: Ambulance, text: "text-chart-5", dot: "bg-chart-5", chip: "border-chart-5/30 bg-chart-5/10 text-chart-5" },
]

/**
 * Pasos de seguimiento que se marcan al cumplirse, según dónde se atendió. Van en orden:
 * cada paso requiere el anterior (la ST2 llega después de la ST7; se paga tras la requisición).
 */
export type PasoSeguimiento = "clinicaRequisicion" | "clinicaPagoCerrado" | "imssSt7" | "imssSt2"
export const SEGUIMIENTO: Partial<Record<AtencionAccidente, readonly { key: PasoSeguimiento; label: string }[]>> = {
  clinica_particular: [
    { key: "clinicaRequisicion", label: "Requisición y orden de compra" },
    { key: "clinicaPagoCerrado", label: "Proceso de pago cerrado" },
  ],
  imss: [
    { key: "imssSt7", label: "ST7 calificado" },
    { key: "imssSt2", label: "ST2 alta médica" },
  ],
}

/** Riesgo de trabajo y racha completan los cinco colores de la paleta. */
export const TONO_RIESGO = { dot: "bg-chart-3", chip: "border-chart-3/30 bg-chart-3/10 text-chart-3" } as const
export const TONO_RACHA = { fondo: "bg-chart-1-soft", texto: "text-chart-1-deep", barra: "bg-chart-1" } as const
/** Accidente sin atención registrada: casco, en ámbar de riesgo. */
const MARCADOR_SIN_ATENCION = { icon: HardHat, text: "text-chart-3" } as const

export interface Accidente {
  id: string
  /** YYYY-MM-DD */
  fecha: string
  numeroEmpleado: string
  /** Nombre del colaborador al registrar (se guarda junto al número). */
  colaborador: string
  descripcion: string
  /** Null en registros anteriores a la severidad. */
  severidad: Severidad | null
  riesgoTrabajo: boolean
  /** Solo con riesgo de trabajo: si hubo incapacidad y cuántos días. */
  incapacidad: boolean | null
  diasIncapacidad: number | null
  /** Si ya se generó el reporte de incidente. */
  reporteGenerado: boolean
  atenciones: AtencionAccidente[]
  /** Solo con servicio médico: días de reposo y si son con goce de sueldo. */
  diasReposo: number | null
  reposoConGoce: boolean | null
  clinicaRequisicion: boolean
  clinicaPagoCerrado: boolean
  imssSt7: boolean
  imssSt2: boolean
}

export type DatosAccidente = Omit<Accidente, "id">

const TABLA = "occupational_accidents"
// Texto literal (no armado con join): el cliente de Supabase lo lee para tipar la respuesta.
const COLUMNAS = "id,accident_date,employee_number,employee_name,description,severity,work_risk,disability,disability_days,incident_report,care,rest_days,rest_paid,clinic_requisition,clinic_payment_closed,imss_st7,imss_st2"

// Alias de tipo (no interface) para que la fila genérica de Supabase se pueda convertir.
type AccidenteRow = {
  id: string
  accident_date: string
  employee_number: string
  employee_name: string
  description: string
  severity: Severidad | null
  work_risk: boolean
  disability: boolean | null
  disability_days: number | null
  incident_report: boolean
  care: AtencionAccidente[]
  rest_days: number | null
  rest_paid: boolean | null
  clinic_requisition: boolean
  clinic_payment_closed: boolean
  imss_st7: boolean
  imss_st2: boolean
}

const deFila = (row: AccidenteRow): Accidente => ({
  id: row.id,
  fecha: row.accident_date,
  numeroEmpleado: row.employee_number,
  colaborador: row.employee_name,
  descripcion: row.description,
  severidad: row.severity,
  riesgoTrabajo: row.work_risk,
  incapacidad: row.disability,
  diasIncapacidad: row.disability_days,
  reporteGenerado: row.incident_report,
  atenciones: row.care,
  diasReposo: row.rest_days,
  reposoConGoce: row.rest_paid,
  clinicaRequisicion: row.clinic_requisition,
  clinicaPagoCerrado: row.clinic_payment_closed,
  imssSt7: row.imss_st7,
  imssSt2: row.imss_st2,
})

/**
 * El nombre no se envía: la tabla lo toma de la plantilla según el número. Los datos que
 * dependen de otro (incapacidad, reposo, seguimiento) se limpian si ese otro no aplica.
 */
function aFila(datos: DatosAccidente) {
  const incapacidad = datos.riesgoTrabajo ? datos.incapacidad === true : null
  const atendido = (atencion: AtencionAccidente) => datos.atenciones.includes(atencion)
  const diasReposo = atendido("servicio_medico") ? datos.diasReposo : null
  const requisicion = atendido("clinica_particular") && datos.clinicaRequisicion
  const st7 = atendido("imss") && datos.imssSt7
  return {
    accident_date: datos.fecha,
    employee_number: datos.numeroEmpleado,
    description: datos.descripcion.trim(),
    severity: datos.severidad,
    work_risk: datos.riesgoTrabajo,
    disability: incapacidad,
    disability_days: incapacidad ? datos.diasIncapacidad : null,
    incident_report: datos.reporteGenerado,
    care: ATENCIONES.map(atencion => atencion.value).filter(atendido),
    rest_days: diasReposo,
    rest_paid: diasReposo ? datos.reposoConGoce : null,
    clinic_requisition: requisicion,
    clinic_payment_closed: requisicion && datos.clinicaPagoCerrado,
    imss_st7: st7,
    imss_st2: st7 && datos.imssSt2,
  }
}

/** Todos los accidentes, del más reciente al más antiguo (la racha necesita el historial). */
export async function cargarAccidentes(): Promise<Accidente[]> {
  const { data, error } = await supabase.from(TABLA).select(COLUMNAS)
    .order("accident_date", { ascending: false })
    .order("created_at", { ascending: false })
  if (error) throw error
  return ((data ?? []) as AccidenteRow[]).map(deFila)
}

export async function crearAccidente(datos: DatosAccidente): Promise<Accidente> {
  const { data, error } = await supabase.from(TABLA).insert(aFila(datos)).select(COLUMNAS).single()
  if (error) throw error
  return deFila(data as AccidenteRow)
}

export async function actualizarAccidente(id: string, datos: DatosAccidente): Promise<Accidente> {
  const { data, error } = await supabase.from(TABLA).update(aFila(datos)).eq("id", id).select(COLUMNAS).single()
  if (error) throw error
  return deFila(data as AccidenteRow)
}

export async function eliminarAccidente(id: string): Promise<void> {
  const { error } = await supabase.from(TABLA).delete().eq("id", id)
  if (error) throw error
}

export interface EmpleadoEncontrado {
  numero: string
  nombre: string
  puesto: string | null
  departamento: string | null
}

/** Colaboradores cuyo número empieza con los dígitos escritos (hasta 20), vía RPC para el rol ehs. */
export async function buscarEmpleadosPorNumero(numero: string): Promise<EmpleadoEncontrado[]> {
  const { data, error } = await supabase.rpc("ehs_buscar_empleados", { p_numero: numero })
  if (error) throw error
  return (data ?? []) as EmpleadoEncontrado[]
}

/** Ícono y color del calendario: los de la atención más alta que recibió (botiquín, clínica, ambulancia). */
export function marcadorAccidente(accidente: Pick<Accidente, "atenciones">): { icon: LucideIcon; text: string } {
  const mayor = [...ATENCIONES].reverse().find(atencion => accidente.atenciones.includes(atencion.value))
  return mayor ?? MARCADOR_SIN_ATENCION
}

const diasEntre = (desde: string, hasta: string) => Math.round((deISO(hasta).getTime() - deISO(desde).getTime()) / 86_400_000)

/**
 * Racha: días sin incidentes. Empieza el día siguiente al último accidente o, si aún
 * no hay ninguno, el 1 de enero del año en curso (inicio del registro anual).
 */
export function racha(accidentes: Pick<Accidente, "fecha">[], hoy = hoyISO()) {
  const fechas = [...new Set(accidentes.map(accidente => accidente.fecha).filter(fecha => fecha <= hoy))].sort()
  const inicioAnio = `${hoy.slice(0, 4)}-01-01`
  const ultimo = fechas.at(-1)
  const desde = ultimo ? sumarDias(ultimo, 1) : inicioAnio
  const actual = Math.max(0, diasEntre(desde, hoy) + 1)

  // Mejor racha del año: el tramo más largo entre accidentes, contando la actual.
  let mejor = actual
  let previo = inicioAnio
  for (const fecha of fechas.filter(value => value >= inicioAnio)) {
    mejor = Math.max(mejor, diasEntre(previo, fecha))
    previo = sumarDias(fecha, 1)
  }
  return { actual, desde, mejor }
}

/** Días del calendario que pertenecen a la racha actual (para pintarlos). */
export function enRacha(fecha: string, desde: string, hoy = hoyISO()): boolean {
  return fecha >= desde && fecha <= hoy
}

/**
 * Trámites abiertos de todos los meses (no solo del visible), en el orden en que avanzan.
 * Cada caso cuenta en un solo renglón: el del siguiente paso que le falta.
 */
export function pendientesSeguimiento(accidentes: Accidente[]) {
  const clinica = accidentes.filter(accidente => accidente.atenciones.includes("clinica_particular"))
  const imss = accidentes.filter(accidente => accidente.atenciones.includes("imss"))
  return [
    { key: "imss-st7", label: "IMSS sin ST7", total: imss.filter(accidente => !accidente.imssSt7).length },
    { key: "imss-st2", label: "IMSS en espera de ST2", total: imss.filter(accidente => accidente.imssSt7 && !accidente.imssSt2).length },
    { key: "clinica-requisicion", label: "Clínica sin requisición", total: clinica.filter(accidente => !accidente.clinicaRequisicion).length },
    { key: "clinica-pago", label: "Clínica por pagar", total: clinica.filter(accidente => accidente.clinicaRequisicion && !accidente.clinicaPagoCerrado).length },
  ]
}

/** Resumen de un mes: total frente a la meta, severidad, riesgos de trabajo, días de incapacidad y atenciones. */
export function resumenMes(accidentes: Accidente[], mes: string) {
  const inicio = inicioMes(mes)
  const fin = sumarDias(sumarMeses(inicio, 1), -1)
  const delMes = accidentes.filter(accidente => accidente.fecha >= inicio && accidente.fecha <= fin)
  return {
    total: delMes.length,
    dentroDeMeta: delMes.length <= META_INCIDENTES_MES,
    riesgosTrabajo: delMes.filter(accidente => accidente.riesgoTrabajo).length,
    diasIncapacidad: delMes.reduce((total, accidente) => total + (accidente.diasIncapacidad ?? 0), 0),
    porSeveridad: SEVERIDADES.map(severidad => ({ ...severidad, total: delMes.filter(accidente => accidente.severidad === severidad.value).length })),
    porAtencion: ATENCIONES.map(atencion => ({ ...atencion, total: delMes.filter(accidente => accidente.atenciones.includes(atencion.value)).length })),
  }
}
