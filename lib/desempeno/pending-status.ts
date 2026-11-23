import { estadoVentanaEvaluacion, type HitoNuevoIngreso } from "@/lib/desempeno/hitos-nuevo-ingreso"

export type PendingEvalStatus = "vencidas" | "proximas" | "a-tiempo"

export function pendingEvalStatus(diasDiff: number, numeroEvaluacion: HitoNuevoIngreso): PendingEvalStatus {
  const estadoVentana = estadoVentanaEvaluacion(numeroEvaluacion, diasDiff)
  if (estadoVentana === "vencido") return "vencidas"
  if (diasDiff < 0) return "a-tiempo"
  if (diasDiff <= (numeroEvaluacion === 3 ? 15 : 7)) return "proximas"
  return "a-tiempo"
}

/** Distancia a una fecha en palabras: "Hoy", "En 3 días" o "Hace 1 día". */
export function dias(diff: number): string {
  if (diff === 0) return "Hoy"
  if (diff < 0) return `Hace ${Math.abs(diff)} día${Math.abs(diff) !== 1 ? "s" : ""}`
  return `En ${diff} día${diff !== 1 ? "s" : ""}`
}
