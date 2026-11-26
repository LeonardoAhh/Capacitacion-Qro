/** Utilidades compartidas por las cargas masivas de /plantilla con datos JSON pegados. */

/** Errores que se listan; el resto se resume en una línea. */
export const MAX_ERRORES_LISTADOS = 5

const FECHA_DMY = /^(\d{2})\/(\d{2})\/(\d{4})$/

/** "DD/MM/AAAA" a "AAAA-MM-DD"; null si el formato no coincide o la fecha no existe. */
export function leerFechaDMY(value: unknown): string | null {
  const match = typeof value === "string" ? FECHA_DMY.exec(value.trim()) : null
  if (!match) return null
  const [dia, mes, anio] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(anio, mes - 1, dia))
  if (date.getUTCFullYear() !== anio || date.getUTCMonth() !== mes - 1 || date.getUTCDate() !== dia) return null
  return `${match[3]}-${match[2]}-${match[1]}`
}

/** Texto o número como texto recortado; vacío si es otro tipo. */
export function leerTexto(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : ""
}

/** Lista de objetos de los datos pegados, o el error que impide leerla. */
export function leerListaJson(texto: string): { filas: Record<string, unknown>[] } | { error: string } {
  let datos: unknown
  try {
    datos = JSON.parse(texto)
  } catch {
    return { error: "Los datos no son un JSON válido." }
  }
  if (!Array.isArray(datos) || datos.length === 0) return { error: "Los datos deben ser una lista con al menos una fila." }
  return { filas: datos.map(fila => (typeof fila === "object" && fila !== null ? fila as Record<string, unknown> : {})) }
}

/** Junta errores por fila: lista los primeros y resume el resto. */
export function crearListaErrores() {
  const errores: string[] = []
  let total = 0
  return {
    agregar(fila: number, problema: string) {
      total++
      if (errores.length < MAX_ERRORES_LISTADOS) errores.push(`Fila ${fila}: ${problema}.`)
    },
    lista(): string[] {
      return total > errores.length ? [...errores, `Y ${total - errores.length} filas más con errores.`] : errores
    },
  }
}
