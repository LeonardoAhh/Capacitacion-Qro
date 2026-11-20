import { timingSafeEqual } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { PARAM_TARJETA, textoAviso, type KanbanAviso } from "@/lib/kanban"
import { pushConfig, sendPush, type PushSubscriptionRow } from "@/lib/push/send"

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

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "No autorizado" }, { status: 401 })
  const parsed = webhookSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Webhook inválido" }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const config = pushConfig()
  if (!url || !serviceKey || !config) {
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

  // Título: quién y qué ("ANA te asignó"); cuerpo: la tarjeta. Breve para pantallas de bloqueo.
  const payload = JSON.stringify({
    title: textoAviso({ tipo: aviso.tipo as KanbanAviso["tipo"], actor_nombre: aviso.actor_nombre }),
    body: aviso.titulo,
    url: aviso.tarjeta_id ? `/kanban?${PARAM_TARJETA}=${encodeURIComponent(aviso.tarjeta_id)}` : "/kanban",
    tag: `kanban-${aviso.id}`,
  })
  const { sent, expired, failed } = await sendPush(db, (subscriptions ?? []) as PushSubscriptionRow[], payload, config)
  return Response.json({ sent, expired, failed }, { status: failed ? 502 : 200 })
}
