import { timingSafeEqual } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { sendNotification } from "web-push"
import { z } from "zod"
import { PARAM_TARJETA, textoAviso, type KanbanAviso } from "@/lib/kanban"

export const runtime = "nodejs"

const webhookSchema = z.object({
  type: z.literal("INSERT"),
  schema: z.literal("public"),
  table: z.literal("kanban_avisos"),
  record: z.object({ id: z.uuid(), user_id: z.uuid() }),
})

function authorized(request: Request) {
  const secret = process.env.KANBAN_PUSH_WEBHOOK_SECRET
  if (!secret) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(request.headers.get("authorization") ?? "")
  return expected.length === received.length && timingSafeEqual(expected, received)
}

function errorStatus(error: unknown) {
  if (typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number") {
    return error.statusCode
  }
  return null
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "No autorizado" }, { status: 401 })
  const parsed = webhookSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Webhook inválido" }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!url || !serviceKey || !publicKey || !privateKey || !subject || !/^(mailto:|https:\/\/)/.test(subject)) {
    return Response.json({ error: "Configuración incompleta" }, { status: 500 })
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { id, user_id: userId } = parsed.data.record
  const { data: aviso, error: avisoError } = await db.from("kanban_avisos")
    .select("id,user_id,tarjeta_id,tipo,titulo,actor_nombre")
    .eq("id", id).eq("user_id", userId).maybeSingle()
  if (avisoError) return Response.json({ error: "No se pudo leer el aviso" }, { status: 500 })
  if (!aviso) return Response.json({ error: "Aviso no encontrado" }, { status: 404 })

  const { data: subscriptions, error: subscriptionError } = await db.from("push_subscriptions")
    .select("id,endpoint,p256dh,auth").eq("user_id", userId)
  if (subscriptionError) return Response.json({ error: "No se pudieron leer las suscripciones" }, { status: 500 })

  const payload = JSON.stringify({
    title: "Kanban",
    body: `${textoAviso({ tipo: aviso.tipo as KanbanAviso["tipo"], actor_nombre: aviso.actor_nombre })} «${aviso.titulo}»`,
    url: aviso.tarjeta_id ? `/kanban?${PARAM_TARJETA}=${encodeURIComponent(aviso.tarjeta_id)}` : "/kanban",
    tag: `kanban-${aviso.id}`,
  })
  let failed = 0
  let sent = 0
  let expired = 0
  await Promise.all((subscriptions ?? []).map(async subscription => {
    try {
      await sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        payload,
        { vapidDetails: { subject, publicKey, privateKey }, TTL: 86400, timeout: 10000 },
      )
      sent++
    } catch (error) {
      if (errorStatus(error) === 404 || errorStatus(error) === 410) {
        const { error: deleteError } = await db.from("push_subscriptions").delete()
          .eq("id", subscription.id).eq("endpoint", subscription.endpoint)
        if (deleteError) failed++
        else expired++
      } else {
        failed++
        console.error("[kanban push] Falló el envío", errorStatus(error))
      }
    }
  }))
  return Response.json({ sent, expired, failed }, { status: failed ? 502 : 200 })
}
