import { supabase } from "@/lib/supabase/client"
import type { EmployeeDayCountImport } from "@/lib/imports/employee-day-count-json"

const CHUNK_SIZE = 200
const MAX_LISTED = 20

/**
 * Verifica que todos los números de empleado de una importación existan en
 * Plantilla (public.employees). Devuelve el mensaje de error o null si todos existen.
 */
export async function validarEmpleadosExistentes(payload: EmployeeDayCountImport): Promise<string | null> {
  const numeros: string[] = [...new Set(payload.meses.flatMap(month => month.registros.map(row => row.numero_empleado.trim())))]
  const encontrados = new Set<string>()

  for (let index = 0; index < numeros.length; index += CHUNK_SIZE) {
    const { data, error } = await supabase
      .from("employees")
      .select("numero")
      .in("numero", numeros.slice(index, index + CHUNK_SIZE))
    if (error) throw error
    for (const row of (data ?? []) as { numero: string | number | null }[]) {
      if (row.numero !== null) encontrados.add(String(row.numero).trim())
    }
  }

  const faltantes = numeros
    .filter(numero => !encontrados.has(numero))
    .sort((first, second) => Number(first) - Number(second) || first.localeCompare(second))
  if (faltantes.length === 0) return null

  const lista = faltantes.slice(0, MAX_LISTED).join(", ")
  const resto = faltantes.length > MAX_LISTED ? ` y ${faltantes.length - MAX_LISTED} más` : ""
  return faltantes.length === 1
    ? `El número de empleado ${lista} no existe en Plantilla. Agrégalo o corrige el archivo antes de cargar.`
    : `${faltantes.length} números de empleado no existen en Plantilla: ${lista}${resto}. Agrégalos o corrige el archivo antes de cargar.`
}
