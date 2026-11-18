import { MAX_CANTIDAD } from "@/lib/plantilla/registros-por-dia"
import type { EmployeeDayCountImport, EmployeeDayCountRow } from "@/lib/imports/employee-day-count-json"

/**
 * Formato del reporte de retardos (una fila por retardo):
 *   { "NOMINA": "330", "NOMBRE": "…", "FECHA": "15/10/2026",
 *     "TIEMPO DE RETARDO": "8", "RETARDO": "SI" }
 * Se agrupa por empleado y día: cada fila suma 1 retardo y sus minutos.
 * Las filas con RETARDO distinto de "SI" se omiten.
 */
export interface RetardosImport extends EmployeeDayCountImport {
  totalMinutos: number
  omitidos: number
}

const KEYS = {
  numero: "NOMINA",
  fecha: "FECHA",
  minutos: "TIEMPO DE RETARDO",
  retardo: "RETARDO",
} as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : ""
}

/** dd/mm/aaaa → { mes: "aaaa-mm", dia } si la fecha existe. */
function parseFecha(value: string): { mes: string; dia: number } | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return null
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return { mes: `${match[3]}-${match[2]}`, dia: day }
}

export function parseRetardosJson(json: string): RetardosImport {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error("JSON inválido. Revisa el formato del archivo.")
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("El archivo debe ser un arreglo JSON con al menos un retardo.")
  }

  // mes → "numero\0dia" → registro agregado
  const months = new Map<string, Map<string, EmployeeDayCountRow>>()
  let omitidos = 0

  for (const [index, raw] of parsed.entries()) {
    const fila = index + 1
    if (!isRecord(raw)) throw new Error(`La fila ${fila} debe ser un objeto JSON.`)

    if (text(raw[KEYS.retardo]).toUpperCase() !== "SI") {
      omitidos += 1
      continue
    }

    const numero = text(raw[KEYS.numero])
    if (!numero) throw new Error(`La fila ${fila} requiere ${KEYS.numero}.`)

    const fecha = parseFecha(text(raw[KEYS.fecha]))
    if (!fecha) throw new Error(`La fila ${fila} (${KEYS.numero} ${numero}) requiere ${KEYS.fecha} válida en formato dd/mm/aaaa.`)

    const minutosTexto = text(raw[KEYS.minutos])
    if (!/^\d+$/.test(minutosTexto) || Number(minutosTexto) > MAX_CANTIDAD) {
      throw new Error(`La fila ${fila} (${KEYS.numero} ${numero}) requiere "${KEYS.minutos}" entero mayor o igual a cero.`)
    }
    const minutos = Number(minutosTexto)

    const month = months.get(fecha.mes) ?? new Map<string, EmployeeDayCountRow>()
    months.set(fecha.mes, month)
    const key = `${numero}\0${fecha.dia}`
    const current = month.get(key) ?? { numero_empleado: numero, dia: fecha.dia, cantidad: 0, minutos: 0 }
    current.cantidad += 1
    current.minutos = (current.minutos ?? 0) + minutos
    if (current.minutos > MAX_CANTIDAD) throw new Error(`Los minutos del empleado ${numero} exceden el límite permitido.`)
    month.set(key, current)
  }

  if (months.size === 0) throw new Error("El archivo no contiene filas con RETARDO = SI.")

  const meses = [...months.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([mes, rows]) => {
      const registros = [...rows.values()]
      return {
        mes,
        empleados: new Set(registros.map(row => row.numero_empleado)).size,
        registros,
        totalCount: registros.reduce((sum, row) => sum + row.cantidad, 0),
      }
    })

  return {
    meses,
    registrosEmpleadoMes: meses.reduce((sum, month) => sum + month.empleados, 0),
    totalCount: meses.reduce((sum, month) => sum + month.totalCount, 0),
    totalMinutos: meses.reduce((sum, month) => sum + month.registros.reduce((acc, row) => acc + (row.minutos ?? 0), 0), 0),
    omitidos,
  }
}
