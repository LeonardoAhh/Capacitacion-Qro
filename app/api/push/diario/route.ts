import { timingSafeEqual } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { evaluationPushDate } from "@/lib/desempeno/push-digest"
import { enviarRecordatorioDesempeno } from "@/lib/push/desempeno-digest"
import { enviarVencimientosKanban } from "@/lib/push/kanban-digest"
import { pushConfig, type DigestResult, type PushSubscriptionRow } from "@/lib/push/send"
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

function total(results: DigestResult[]): DigestResult {
  return results.reduce((sum, current) => ({
    sent: sum.sent + current.sent,
    expired: sum.expired + current.expired,
    failed: sum.failed + current.failed,
    skipped: sum.skipped + current.skipped,
  }), { sent: 0, expired: 0, failed: 0, skipped: 0 })
}

/**
 * Cron diario (vercel.json): un solo envío por la mañana con los recordatorios
 * del día. Evaluaciones para evaluadores; tarjetas por vencer para el equipo del Kanban.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "No autorizado" }, { status: 401 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const config = pushConfig()
  if (!url || !serviceKey || !config) return Response.json({ error: "Configuración incompleta" }, { status: 500 })

  try {
    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const subscriptions = await loadServerRows<PushSubscriptionRow & { user_id: string }>((from, to) => db.from("push_subscriptions")
      .select("id,user_id,endpoint,p256dh,auth").order("id").range(from, to))
    const subscriptionsByUser = new Map<string, PushSubscriptionRow[]>()
    for (const subscription of subscriptions) {
      if (!subscriptionsByUser.has(subscription.user_id)) subscriptionsByUser.set(subscription.user_id, [])
      subscriptionsByUser.get(subscription.user_id)!.push(subscription)
    }

    const fecha = evaluationPushDate()
    const [desempeno, kanban] = await Promise.all([
      enviarRecordatorioDesempeno(db, config, subscriptionsByUser, fecha),
      enviarVencimientosKanban(db, config, subscriptionsByUser, fecha.iso),
    ])
    return Response.json({ desempeno: total(desempeno), kanban: total(kanban) })
  } catch (error) {
    console.error("[push diario] Falló el envío", error)
    return Response.json({ error: "No se pudieron enviar los recordatorios" }, { status: 500 })
  }
}
