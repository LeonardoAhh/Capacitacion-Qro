/**
 * Registros por empleado y día (incumplimientos, retardos, omisiones de marcaje):
 * misma tabla (numero_empleado, mes, dia, cantidad) y misma RPC de captura individual.
 * Cada tipo solo aporta su tabla, su RPC y sus textos.
 */

export interface TipoRegistro {
  /** Valor guardado en la base. */
  value: string
  label: string
}

export interface RegistroPorDiaConfig {
  /** Tabla con columnas numero_empleado, mes (YYYY-MM), dia y cantidad. */
  tabla: string
  /** RPC (p_numero_empleado, p_fecha, p_cantidad, p_cantidad_anterior). */
  rpcRegistrar: string
  singular: string
  plural: string
  /** Registra minutos por día (RPC con p_minutos / p_minutos_anterior). */
  conMinutos?: boolean
  /**
   * Un tipo por registro: la captura marca tipos y la cantidad del día es cuántos se marcaron
   * (RPC con p_tipos / p_tipos_anteriores, sin p_cantidad).
   */
  tipos?: readonly TipoRegistro[]
}

export const INCUMPLIMIENTOS_CONFIG: RegistroPorDiaConfig = {
  tabla: "incumplimientos_reglamento",
  rpcRegistrar: "registrar_incumplimiento_reglamento",
  singular: "incumplimiento",
  plural: "incumplimientos",
}

export const RETARDOS_CONFIG: RegistroPorDiaConfig = {
  tabla: "retardos",
  rpcRegistrar: "registrar_retardo",
  singular: "retardo",
  plural: "retardos",
  conMinutos: true,
}

export const TIPOS_OMISION_MARCAJE: readonly TipoRegistro[] = [
  { value: "entrada", label: "Entrada" },
  { value: "salida", label: "Salida" },
  { value: "salida_comida", label: "Salida a comer" },
  { value: "regreso_comida", label: "Regreso de comer" },
]

export const OMISIONES_MARCAJE_CONFIG: RegistroPorDiaConfig = {
  tabla: "omisiones_marcaje",
  rpcRegistrar: "registrar_omision_marcaje",
  singular: "omisión",
  plural: "omisiones",
  tipos: TIPOS_OMISION_MARCAJE,
}

export interface RegistroPorDia {
  numero_empleado: string
  mes: string
  dia: number
  cantidad: number
  minutos?: number
  /** Solo con config.tipos: un tipo por registro del día. */
  tipos?: string[]
}

/** Etiquetas de los tipos en el orden del catálogo. */
export function tipoLabels(config: RegistroPorDiaConfig, tipos: readonly string[] | undefined): string[] {
  return (config.tipos ?? []).filter(tipo => tipos?.includes(tipo.value)).map(tipo => tipo.label)
}

/** Valores capturables de un día. */
export interface ValoresDia {
  cantidad: number
  minutos: number
  /** Solo con config.tipos. */
  tipos?: string[]
}

/** Límite de integer en Postgres. */
export const MAX_CANTIDAD = 2_147_483_647

export function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase("es-MX") + value.slice(1)
}

export function formatCount(count: number, config: RegistroPorDiaConfig): string {
  return `${count} ${count === 1 ? config.singular : config.plural}`
}

export function formatMinutes(minutes: number): string {
  return `${minutes} min`
}

export function formatMonth(month: string): string {
  const label = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`))
  return capitalize(label)
}

export function today(): string {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function recordDate(record: RegistroPorDia): string {
  return `${record.mes}-${String(record.dia).padStart(2, "0")}`
}

export function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

/** Orden de la ficha: meses recientes primero, días ascendentes. */
export function sortRecords(records: RegistroPorDia[]): RegistroPorDia[] {
  return [...records].sort((first, second) =>
    second.mes.localeCompare(first.mes) || first.dia - second.dia,
  )
}
