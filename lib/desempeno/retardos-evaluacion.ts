import { mesesDePeriodo } from "@/lib/catalogo"
import { calcularPorcentajePorCantidad } from "@/lib/desempeno/actas-evaluacion"
import { supabase } from "@/lib/supabase/client"
import { CumplimientoOperativoIndex, type DesempenoData } from "@/lib/types/desempeno"

/** Calcula la puntualidad con la cantidad de retardos del periodo evaluado. */
export async function aplicarRetardosDelPeriodo(data: DesempenoData): Promise<DesempenoData> {
  const index = CumplimientoOperativoIndex.Puntualidad
  if (data.tipo === "jefe" || !data.cumplimiento_responsabilidades[index]) return data

  const meses = mesesDePeriodo(data.periodo)
  if (meses.length === 0) {
    throw new Error(`No se puede determinar el rango de fechas del periodo "${data.periodo}".`)
  }

  const { data: registros, error } = await supabase
    .from("retardos")
    .select("cantidad")
    .eq("numero_empleado", data.numero_empleado)
    .in("mes", meses)

  if (error) throw error

  const cantidad = (registros ?? []).reduce((total, registro) => total + registro.cantidad, 0)
  const cumplimiento_responsabilidades = data.cumplimiento_responsabilidades.map((item, itemIndex) =>
    itemIndex === index
      ? { ...item, porcentaje: String(calcularPorcentajePorCantidad(cantidad)), no_aplica: false }
      : item
  )

  return { ...data, cumplimiento_responsabilidades }
}
