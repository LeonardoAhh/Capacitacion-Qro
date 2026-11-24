import { getPeriodoActual, type PeriodoModo } from "@/lib/catalogo"
import { esElegibleParaPeriodo } from "@/lib/desempeno/elegibilidad"
import { semestreAEvaluar, semestreEnEntrega } from "@/lib/desempeno/ventana-entrega"

export type OrigenEmpleado = "planta" | "nuevo_ingreso"

/** Periodo que se evalúa hoy en cada modalidad; el semestral sigue la recepción de físicos. */
export function periodoAEvaluar(modo: PeriodoModo, fecha = new Date()) {
  return modo === "semestrales" ? semestreAEvaluar(fecha) : getPeriodoActual(modo, fecha)
}

/** La misma asignación que usa Evaluar para una evaluación nueva. */
export function periodoVigenteParaEmpleado(origen: OrigenEmpleado, fechaIngreso: string | null, fecha = new Date()) {
  const semestreActual = semestreAEvaluar(fecha)
  const requiereSemestral = origen === "planta" && esElegibleParaPeriodo(fechaIngreso, semestreActual).elegible
  const modo: PeriodoModo = requiereSemestral ? "semestrales" : "mensuales"
  // Las semestrales solo se capturan durante la recepción de físicos.
  const capturaAbierta = modo !== "semestrales" || semestreEnEntrega(fecha) !== null
  return { modo, periodo: periodoAEvaluar(modo, fecha), semestreActual, requiereSemestral, capturaAbierta }
}
