import { formatDate, daysFromToday, evalStatus } from "@/lib/hooks"
import type { EvalStatus } from "@/lib/hooks"
import type { HitoNuevoIngreso } from "@/lib/desempeno/hitos-nuevo-ingreso"
import { cn } from "@/lib/utils"

/** Color del estado de una evaluación: solo lo que pide atención se resalta. */
const EVAL_TONE: Record<EvalStatus, string> = {
  completada: "text-foreground",
  disponible: "text-success",
  proxima: "text-warning-deep",
  hoy: "text-warning-deep",
  vencida: "text-destructive",
  pendiente: "text-foreground",
}

const LINE = "block truncate text-body-sm"

function enDias(diff: number) {
  if (diff === 0) return "Hoy"
  return diff > 0 ? `En ${diff} ${diff === 1 ? "día" : "días"}` : `Hace ${Math.abs(diff)} ${diff === -1 ? "día" : "días"}`
}

/** Celda de evaluación (tabla): fecha arriba; abajo la calificación o cuánto falta. */
export function EvalCell({ fecha, calificacion, numeroEvaluacion }: {
  fecha: string | null
  calificacion: number | null
  numeroEvaluacion: HitoNuevoIngreso
}) {
  const status = evalStatus(fecha, calificacion, numeroEvaluacion)
  const diff = daysFromToday(fecha)
  const detalle = calificacion != null
    ? `Calificación ${calificacion}`
    : status === "disponible" ? "Disponible" : diff !== null ? enDias(diff) : "—"
  return <>
    <span className={cn(LINE, EVAL_TONE[status])}>{formatDate(fecha)}</span>
    <span className={cn(LINE, calificacion != null && calificacion < 70 ? "text-destructive" : "text-muted-foreground")}>{detalle}</span>
  </>
}

/** Celda de término de contrato: fecha y, si es a prueba, cuánto falta (en color si urge). */
export function ContratoTerminoCell({ tipo, fecha, indeterminado }: { tipo: string | null; fecha: string | null; indeterminado: boolean }) {
  const diff = daysFromToday(fecha)
  const tone = indeterminado || diff === null ? "text-muted-foreground" : diff < 0 ? "text-destructive" : diff <= 10 ? "text-warning-deep" : "text-muted-foreground"
  return <>
    <span className={cn(LINE, "text-foreground")}>{tipo ?? "—"}</span>
    <span className={cn(LINE, tone)}>
      {diff === null ? "Sin término" : indeterminado ? formatDate(fecha) : `${formatDate(fecha)} · ${diff < 0 ? `vencido` : enDias(diff).toLowerCase()}`}
    </span>
  </>
}
