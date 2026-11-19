import { estadoVentanaEvaluacion, type HitoNuevoIngreso } from "@/lib/desempeno/hitos-nuevo-ingreso"

export type PendingEvalStatus = "vencidas" | "proximas" | "a-tiempo"

export function pendingEvalStatus(diasDiff: number, numeroEvaluacion: HitoNuevoIngreso): PendingEvalStatus {
  const estadoVentana = estadoVentanaEvaluacion(numeroEvaluacion, diasDiff)
  if (estadoVentana === "vencido") return "vencidas"
  if (diasDiff < 0) return "a-tiempo"
  if (diasDiff <= (numeroEvaluacion === 3 ? 15 : 7)) return "proximas"
  return "a-tiempo"
}
