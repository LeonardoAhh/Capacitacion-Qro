import { getTodayInTimeZone } from "@/lib/cumpleanos"
import { normalizeDepartamento } from "@/lib/catalogo"
import { HITOS_NUEVO_INGRESO, type SeguimientoNuevoIngreso } from "@/lib/desempeno/hitos-nuevo-ingreso"
import { pendingEvalStatus } from "@/lib/desempeno/pending-status"
import { rolesWith } from "@/lib/constants/roles"

export interface EvaluationPushRecord extends SeguimientoNuevoIngreso {
  numero: string | null
  departamento: string | null
  tipo_contrato: string | null
}

export interface EvaluatorProfile {
  user_id: string
  role: string
  departamentos: string[] | null
}

/** Quienes supervisan (lib/constants/roles) ven las evaluaciones de toda la empresa; los evaluadores, las suyas. */
export const ROLES_EVALUACIONES_GLOBALES: string[] = rolesWith("supervisesEvaluations")

export interface EvaluatorAssignment {
  evaluator_user_id: string
  numero_empleado: string
}

export function evaluationPushDate() {
  const today = getTodayInTimeZone()
  const iso = `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`
  return { iso, utcDay: Date.UTC(today.year, today.month - 1, today.day) }
}

export function evaluationPushCounts(
  records: EvaluationPushRecord[],
  profile: EvaluatorProfile,
  assignedNumbers: Set<string>,
  todayUtcDay: number,
) {
  const global = ROLES_EVALUACIONES_GLOBALES.includes(profile.role)
  const departments = new Set((profile.departamentos ?? []).map(normalizeDepartamento))
  let vencidas = 0
  let proximas = 0

  for (const record of records) {
    if (!record.numero || record.tipo_contrato === "Indeterminado") continue
    if (!global && !assignedNumbers.has(record.numero) && !departments.has(normalizeDepartamento(record.departamento))) continue

    for (const hito of HITOS_NUEVO_INGRESO) {
      const fecha = record[hito.fecha]
      if (!fecha || record[hito.calificacion] !== null) continue
      const [year, month, day] = fecha.split("-").map(Number)
      const diasDiff = Math.round((Date.UTC(year, month - 1, day) - todayUtcDay) / 86_400_000)
      if (!Number.isFinite(diasDiff)) continue
      const status = pendingEvalStatus(diasDiff, hito.numero)
      if (status === "vencidas") vencidas++
      if (status === "proximas") proximas++
    }
  }

  return { vencidas, proximas }
}
