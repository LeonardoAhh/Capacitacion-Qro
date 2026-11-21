import type { SupabaseClient } from "@supabase/supabase-js"
import { participa, PARAM_TARJETA, sumarDias, type KanbanTarjeta } from "@/lib/kanban"
import { claimDigest, releaseDigest, type DigestResult, type PushConfig, sendPush, type PushSubscriptionRow } from "@/lib/push/send"
import { loadServerRows } from "@/lib/supabase/server-pagination"
import { rolesWithRoute } from "@/lib/constants/roles"
import { TRAINING_WORKSPACE_PATH } from "@/lib/workspace-paths"

type TarjetaVence = Pick<KanbanTarjeta, "id" | "titulo" | "fecha_limite" | "responsable_id" | "colaboradores">

/** Texto breve: una tarjeta se nombra; varias se cuentan. */
function mensaje(propias: TarjetaVence[], hoy: string) {
  const deHoy = propias.filter(tarjeta => tarjeta.fecha_limite === hoy).length
  const deManana = propias.length - deHoy
  if (propias.length === 1) {
    const [tarjeta] = propias
    return {
      title: deHoy ? "Vence hoy" : "Vence mañana",
      body: tarjeta.titulo,
      url: `/kanban?${PARAM_TARJETA}=${encodeURIComponent(tarjeta.id)}`,
    }
  }
  return {
    title: "Tarjetas por vencer",
    body: [deHoy && `${deHoy} hoy`, deManana && `${deManana} mañana`].filter(Boolean).join(" · "),
    url: "/kanban",
  }
}

/** Aviso diario a quien participa en tarjetas abiertas que vencen hoy o mañana. */
export async function enviarVencimientosKanban(
  db: SupabaseClient,
  config: PushConfig,
  subscriptionsByUser: Map<string, PushSubscriptionRow[]>,
  hoy: string,
): Promise<DigestResult[]> {
  const [miembros, tarjetas] = await Promise.all([
    loadServerRows<{ user_id: string }>((from, to) => db.from("profiles")
      .select("user_id").in("role", rolesWithRoute(TRAINING_WORKSPACE_PATH)).order("user_id").range(from, to)),
    loadServerRows<TarjetaVence>((from, to) => db.from("kanban_tarjetas")
      .select("id,titulo,fecha_limite,responsable_id,colaboradores")
      .neq("estado", "concluido").gte("fecha_limite", hoy).lte("fecha_limite", sumarDias(hoy, 1))
      .order("fecha_limite").order("id").range(from, to)),
  ])

  const usuarios = [...new Set(miembros.map(miembro => miembro.user_id))]
  return Promise.all(usuarios.map(async userId => {
    const subscriptions = subscriptionsByUser.get(userId) ?? []
    const propias = tarjetas.filter(tarjeta => participa(tarjeta, userId))
    if (!subscriptions.length || !propias.length) return { sent: 0, expired: 0, failed: 0, skipped: 1 }

    const claim = { ref_id: userId, ref_type: "kanban_vence", days_before: 0, sent_at: hoy }
    if (!await claimDigest(db, claim)) return { sent: 0, expired: 0, failed: 0, skipped: 1 }

    const payload = JSON.stringify({ ...mensaje(propias, hoy), tag: `kanban-vence-${hoy}` })
    const result = await sendPush(db, subscriptions, payload, config)
    if (!result.sent) await releaseDigest(db, claim)
    return { ...result, skipped: 0 }
  }))
}
