/**
 * Fechas de calendario como texto YYYY-MM-DD en hora local: sin desfase por zona
 * horaria al guardar o comparar días. Compartidas por Kanban y los calendarios.
 */

/** Date local → YYYY-MM-DD. */
export function aISO(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-")
}

/** YYYY-MM-DD → Date local a medianoche. */
export function deISO(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day)
}

/** Fecha local de hoy en YYYY-MM-DD. */
export function hoyISO(): string {
  return aISO(new Date())
}

export function sumarDias(iso: string, dias: number): string {
  const date = deISO(iso)
  return aISO(new Date(date.getFullYear(), date.getMonth(), date.getDate() + dias))
}

/** Lunes de la semana que contiene la fecha. */
export function inicioSemana(iso: string): string {
  return sumarDias(iso, -((deISO(iso).getDay() + 6) % 7))
}

/** Las 7 fechas de lunes a domingo de la semana que empieza en `lunes`. */
export function diasDeSemana(lunes: string): string[] {
  return Array.from({ length: 7 }, (_, index) => sumarDias(lunes, index))
}

/** Número de semana ISO 8601 de la semana que empieza en `lunes` y su año (el del jueves). */
export function semanaIso(lunes: string): { semana: number; anio: number } {
  const jueves = deISO(sumarDias(lunes, 3))
  const anio = jueves.getFullYear()
  const lunesSemana1 = deISO(inicioSemana(aISO(new Date(anio, 0, 4))))
  const dias = Math.round((deISO(lunes).getTime() - lunesSemana1.getTime()) / 86_400_000)
  return { semana: Math.floor(dias / 7) + 1, anio }
}

/** Primer día del mes de la fecha. */
export function inicioMes(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}

/** Primer día del mes desplazado `meses` hacia adelante (o atrás). */
export function sumarMeses(iso: string, meses: number): string {
  const date = deISO(inicioMes(iso))
  return aISO(new Date(date.getFullYear(), date.getMonth() + meses, 1))
}

const FECHA_CORTA = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" })

/** "2026-11-18" → "18 nov". */
export function formatFechaCorta(iso: string): string {
  return FECHA_CORTA.format(deISO(iso)).replace(".", "")
}

/** Escritura de fecha en DD/MM/AAAA: solo dígitos y las diagonales se ponen solas. */
export function enmascararFecha(texto: string): string {
  const digits = texto.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/** "24/11/2026" → "2026-11-24"; null si está incompleta o no existe (p. ej. 31/02). */
export function textoAISO(texto: string): string | null {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) return null
  const [day, month, year] = texto.split("/").map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? aISO(date) : null
}

/** "2026-11-24" → "24/11/2026". */
export function isoATexto(iso: string): string {
  return iso ? iso.split("-").reverse().join("/") : ""
}
