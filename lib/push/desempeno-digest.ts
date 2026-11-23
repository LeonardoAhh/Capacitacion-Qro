import type { SupabaseClient } from "@supabase/supabase-js"
import {
  evaluationPushCounts, ROLES_EVALUACIONES_GLOBALES, type EvaluationPushRecord, type EvaluatorAssignment, type EvaluatorProfile,
} from "@/lib/desempeno/push-digest"
import { claimDigest, releaseDigest, type DigestResult, type PushConfig, sendPush, type PushSubscriptionRow } from "@/lib/push/send"
import { loadServerRows } from "@/lib/supabase/server-pagination"
import { DESEMPENO } from "@/lib/desempeno/presentation"

/**
 * Recordatorio diario de evaluaciones vencidas o próximas: a cada evaluador las
 * suyas y a dev/admin las de toda la empresa.
 */
export async function enviarRecordatorioDesempeno(
  db: SupabaseClient,
  config: PushConfig,
  subscriptionsByUser: Map<string, PushSubscriptionRow[]>,
  fecha: { iso: string; utcDay: number },
): Promise<DigestResult[]> {
  const [profiles, assignments, records] = await Promise.all([
    loadServerRows<EvaluatorProfile>((from, to) => db.from("profiles")
      .select("user_id,role,departamentos").in("role", ["evaluador", ...ROLES_EVALUACIONES_GLOBALES])
      .order("user_id").range(from, to)),
    loadServerRows<EvaluatorAssignment>((from, to) => db.from("evaluator_employee_assignments")
      .select("evaluator_user_id,numero_empleado").order("evaluator_user_id").order("numero_empleado").range(from, to)),
    loadServerRows<EvaluationPushRecord>((from, to) => db.from("nuevo_ingreso")
      .select("numero,departamento,tipo_contrato,eval_1_fecha,eval_1_calificacion,eval_2_fecha,eval_2_calificacion,eval_3_fecha,eval_3_calificacion")
      .order("id").range(from, to)),
  ])
  const assignmentsByUser = new Map<string, Set<string>>()
  for (const assignment of assignments) {
    if (!assignmentsByUser.has(assignment.evaluator_user_id)) assignmentsByUser.set(assignment.evaluator_user_id, new Set())
    assignmentsByUser.get(assignment.evaluator_user_id)!.add(assignment.numero_empleado)
  }

  return Promise.all(profiles.map(async profile => {
    const subscriptions = subscriptionsByUser.get(profile.user_id) ?? []
    if (!subscriptions.length) return { sent: 0, expired: 0, failed: 0, skipped: 1 }
    const { vencidas, proximas } = evaluationPushCounts(
      records, profile, assignmentsByUser.get(profile.user_id) ?? new Set<string>(), fecha.utcDay,
    )
    if (!vencidas && !proximas) return { sent: 0, expired: 0, failed: 0, skipped: 1 }

    const claim = { ref_id: profile.user_id, ref_type: "desempeno", days_before: 0, sent_at: fecha.iso }
    if (!await claimDigest(db, claim)) return { sent: 0, expired: 0, failed: 0, skipped: 1 }

    const parts = [
      vencidas && `${vencidas} ${vencidas === 1 ? "vencida" : "vencidas"}`,
      proximas && `${proximas} ${proximas === 1 ? "próxima" : "próximas"}`,
    ].filter(Boolean)
    const payload = JSON.stringify({
      title: "Evaluaciones de desempeño",
      body: parts.join(" · "),
      url: DESEMPENO.routes.pending,
      tag: `desempeno-${fecha.iso}`,
    })
    const result = await sendPush(db, subscriptions, payload, config)
    if (!result.sent) await releaseDigest(db, claim)
    return { ...result, skipped: 0 }
  }))
}
