import { timingSafeEqual } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { evaluationPushCounts, evaluationPushDate, type EvaluationPushRecord, type EvaluatorAssignment, type EvaluatorProfile } from "@/lib/desempeno/push-digest"
import { pushConfig, sendPush, type PushSubscriptionRow } from "@/lib/push/send"
import { loadServerRows } from "@/lib/supabase/server-pagination"

export const runtime = "nodejs"
export const maxDuration = 60

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(request.headers.get("authorization") ?? "")
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "No autorizado" }, { status: 401 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const config = pushConfig()
  if (!url || !serviceKey || !config) return Response.json({ error: "Configuración incompleta" }, { status: 500 })

  try {
    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const [profiles, assignments, records, subscriptions] = await Promise.all([
      loadServerRows<EvaluatorProfile>((from, to) => db.from("profiles")
        .select("user_id,departamentos").eq("role", "evaluador").order("user_id").range(from, to)),
      loadServerRows<EvaluatorAssignment>((from, to) => db.from("evaluator_employee_assignments")
        .select("evaluator_user_id,numero_empleado").order("evaluator_user_id").order("numero_empleado").range(from, to)),
      loadServerRows<EvaluationPushRecord>((from, to) => db.from("nuevo_ingreso")
        .select("numero,departamento,tipo_contrato,eval_1_fecha,eval_1_calificacion,eval_2_fecha,eval_2_calificacion,eval_3_fecha,eval_3_calificacion")
        .order("id").range(from, to)),
      loadServerRows<PushSubscriptionRow & { user_id: string }>((from, to) => db.from("push_subscriptions")
        .select("id,user_id,endpoint,p256dh,auth").order("id").range(from, to)),
    ])
    const { iso, utcDay } = evaluationPushDate()
    const assignmentsByUser = new Map<string, Set<string>>()
    for (const assignment of assignments) {
      if (!assignmentsByUser.has(assignment.evaluator_user_id)) assignmentsByUser.set(assignment.evaluator_user_id, new Set())
      assignmentsByUser.get(assignment.evaluator_user_id)!.add(assignment.numero_empleado)
    }
    const subscriptionsByUser = new Map<string, PushSubscriptionRow[]>()
    for (const subscription of subscriptions) {
      if (!subscriptionsByUser.has(subscription.user_id)) subscriptionsByUser.set(subscription.user_id, [])
      subscriptionsByUser.get(subscription.user_id)!.push(subscription)
    }

    const results = await Promise.all(profiles.map(async profile => {
      const userSubscriptions = subscriptionsByUser.get(profile.user_id) ?? []
      if (!userSubscriptions.length) return { sent: 0, expired: 0, failed: 0, skipped: 1 }
      const { vencidas, proximas } = evaluationPushCounts(
        records, profile, assignmentsByUser.get(profile.user_id) ?? new Set<string>(), utcDay,
      )
      if (!vencidas && !proximas) return { sent: 0, expired: 0, failed: 0, skipped: 1 }

      const claim = { ref_id: profile.user_id, ref_type: "desempeno", days_before: 0, sent_at: iso }
      const { error: claimError } = await db.from("push_sent_log").insert(claim)
      if (claimError?.code === "23505") return { sent: 0, expired: 0, failed: 0, skipped: 1 }
      if (claimError) throw new Error(claimError.message)

      const parts = [
        vencidas && `${vencidas} ${vencidas === 1 ? "vencida" : "vencidas"}`,
        proximas && `${proximas} ${proximas === 1 ? "próxima" : "próximas"}`,
      ].filter(Boolean)
      const payload = JSON.stringify({
        title: "Evaluaciones de desempeño",
        body: parts.join(" · "),
        url: "/desempeno/pendientes",
        tag: `desempeno-${iso}`,
      })
      const result = await sendPush(db, userSubscriptions, payload, config)
      if (!result.sent) {
        const { error: rollbackError } = await db.from("push_sent_log").delete()
          .eq("ref_id", claim.ref_id).eq("ref_type", claim.ref_type)
          .eq("days_before", claim.days_before).eq("sent_at", claim.sent_at)
        if (rollbackError) throw new Error(rollbackError.message)
      }
      return { ...result, skipped: 0 }
    }))

    return Response.json(results.reduce((total, current) => ({
      sent: total.sent + current.sent,
      expired: total.expired + current.expired,
      failed: total.failed + current.failed,
      skipped: total.skipped + current.skipped,
    }), { sent: 0, expired: 0, failed: 0, skipped: 0 }))
  } catch (error) {
    console.error("[desempeno push] Falló el recordatorio", error)
    return Response.json({ error: "No se pudieron enviar los recordatorios" }, { status: 500 })
  }
}
