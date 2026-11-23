/**
 * Registros por empleado y día (incumplimientos, retardos): misma tabla
 * (numero_empleado, mes, dia, cantidad) y misma RPC de captura individual.
 * Cada tipo solo aporta su tabla, su RPC y sus textos.
 */

export interface RegistroPorDiaConfig {
  /** Tabla con columnas numero_empleado, mes (YYYY-MM), dia y cantidad. */
  tabla: string
  /** RPC (p_numero_empleado, p_fecha, p_cantidad, p_cantidad_anterior). */
  rpcRegistrar: string
  singular: string
  plural: string
  /** Registra minutos por día (RPC con p_minutos / p_minutos_anterior). */
  conMinutos?: boolean
  /** RPC de importación mensual (p_periodos), si el tipo la tiene. */
  rpcReemplazarMeses?: string
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
  rpcReemplazarMeses: "reemplazar_meses_retardos",
}

export interface RegistroPorDia {
  numero_empleado: string
  mes: string
  dia: number
  cantidad: number
  minutos?: number
}

/** Valores capturables de un día. */
export interface ValoresDia {
  cantidad: number
  minutos: number
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
