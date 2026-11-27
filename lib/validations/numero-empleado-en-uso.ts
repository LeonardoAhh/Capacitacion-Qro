import { supabase } from "@/lib/supabase/client"

/** Tablas donde se da de alta a un empleado con su número. */
export type TablaEmpleados = "nuevo_ingreso" | "employees"

/**
 * Nombre de quien ya tiene ese número en la tabla, o null si está libre. Se consulta antes de
 * guardar para avisar con el nombre, en lugar del error genérico de duplicado de la base.
 */
export async function numeroEmpleadoEnUso(tabla: TablaEmpleados, numero: string): Promise<string | null> {
  const { data, error } = await supabase
    .from(tabla)
    .select("nombre")
    .eq("numero", numero)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? String(data.nombre ?? "") || "otro empleado" : null
}
