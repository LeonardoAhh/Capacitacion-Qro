import { createClient } from "@supabase/supabase-js"
import { getTodayInTimeZone } from "@/lib/cumpleanos"
import { sendKanbanResumenEmail } from "@/lib/email/client"
import {
  estaVencida, formatFechaCorta, ordenarTarjetas, participa, sumarDias,
  type KanbanTarjeta,
} from "@/lib/kanban"
import type { KanbanResumenItem } from "@/lib/email/templates/kanban-resumen"

const ROLES_TABLERO = ["dev", "admin"]
const DIAS_SEMANA = 7

interface PerfilTablero {
  user_id: string
  display_name: string | null
  first_name: string | null
}

type TarjetaResumen = Pick<KanbanTarjeta,
  "id" | "titulo" | "estado" | "prioridad" | "fecha_limite" | "created_at" | "responsable_id" | "colaboradores"
  | "necesita_apoyo" | "apoyo_nota" | "concluido_at">

/** Lunes por la mañana (vercel.json): resumen del tablero para cada integrante con correo. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    return Response.json({ error: "Configuración del servidor incompleta" }, { status: 500 })
  }

  try {
    const db = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const today = getTodayInTimeZone()
    const hoy = `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`
    const finSemana = sumarDias(hoy, DIAS_SEMANA - 1)
    const haceUnaSemana = new Date(Date.now() - DIAS_SEMANA * 86_400_000).toISOString()

    const [perfilesResult, usuariosResult, abiertasResult, concluidasResult] = await Promise.all([
      db.from("profiles").select("user_id, display_name, first_name").in("role", ROLES_TABLERO),
      db.auth.admin.listUsers({ perPage: 1000 }),
      db.from("kanban_tarjetas")
        .select("id, titulo, estado, prioridad, fecha_limite, created_at, responsable_id, colaboradores, necesita_apoyo, apoyo_nota, concluido_at")
        .neq("estado", "concluido"),
      db.from("kanban_tarjetas").select("id", { count: "exact", head: true })
        .eq("estado", "concluido").gte("concluido_at", haceUnaSemana),
    ])
    if (perfilesResult.error) throw new Error(perfilesResult.error.message)
    if (usuariosResult.error) throw new Error(usuariosResult.error.message)
    if (abiertasResult.error) throw new Error(abiertasResult.error.message)
    if (concluidasResult.error) throw new Error(concluidasResult.error.message)

    // El correo sale de la cuenta (auth.users); los perfiles sin cuenta se omiten.
    const correos = new Map(usuariosResult.data.users.flatMap(user => user.email ? [[user.id, user.email] as const] : []))
    const abiertas = ordenarTarjetas((abiertasResult.data ?? []) as unknown as KanbanTarjeta[]) as TarjetaResumen[]
    const enlace = new URL("/kanban", request.url).toString()
    const semana = `${formatFechaCorta(hoy)} – ${formatFechaCorta(finSemana)}`
    const vistos = new Set<string>()
    const results: Array<{ ok: boolean }> = []

    for (const perfil of (perfilesResult.data ?? []) as PerfilTablero[]) {
      const correo = correos.get(perfil.user_id)
      if (!correo || vistos.has(perfil.user_id)) continue
      vistos.add(perfil.user_id)

      const pendientes: KanbanResumenItem[] = abiertas
        .filter(tarjeta => participa(tarjeta, perfil.user_id) && tarjeta.fecha_limite && tarjeta.fecha_limite <= finSemana)
        .map(tarjeta => {
          const vencida = estaVencida(tarjeta, hoy)
          return {
            titulo: tarjeta.titulo,
            detalle: `${vencida ? "Vencida" : "Vence"} ${formatFechaCorta(tarjeta.fecha_limite as string)}`,
            alerta: vencida,
          }
        })
      const apoyo: KanbanResumenItem[] = abiertas
        .filter(tarjeta => tarjeta.necesita_apoyo && !participa(tarjeta, perfil.user_id))
        .map(tarjeta => ({ titulo: tarjeta.titulo, detalle: tarjeta.apoyo_nota ?? "Pide apoyo" }))

      try {
        await sendKanbanResumenEmail(correo, {
          nombre: perfil.first_name?.trim() || perfil.display_name?.trim() || correo,
          semana,
          pendientes,
          apoyo,
          concluidasEquipo: concluidasResult.count ?? 0,
          enlace,
        })
        results.push({ ok: true })
      } catch (error) {
        console.error("[cron/kanban] Falló el envío", error)
        results.push({ ok: false })
      }
    }

    return Response.json({
      fecha: hoy,
      procesados: results.length,
      enviados: results.filter(result => result.ok).length,
    })
  } catch (error) {
    console.error("[GET /api/kanban/resumen-semanal]", error)
    return Response.json({ error: "No se pudo enviar el resumen semanal" }, { status: 500 })
  }
}
