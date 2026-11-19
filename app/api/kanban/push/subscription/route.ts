import { createServerClient } from "@supabase/ssr"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { z } from "zod"

export const runtime = "nodejs"

const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(2048),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
})
const endpointSchema = subscriptionSchema.pick({ endpoint: true })

type Access =
  | { authorized: true; userId: string; db: SupabaseClient }
  | { authorized: false; response: Response }

async function access(request: Request): Promise<Access> {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return { authorized: false, response: Response.json({ error: "Origen no autorizado" }, { status: 403 }) }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceKey) {
    return { authorized: false, response: Response.json({ error: "Configuración incompleta" }, { status: 500 }) }
  }
  const cookieStore = await cookies()
  const auth = createServerClient(url, anonKey, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  })
  const { data: { user }, error } = await auth.auth.getUser()
  if (error || !user) return { authorized: false, response: Response.json({ error: "No autorizado" }, { status: 401 }) }
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  return { authorized: true, userId: user.id, db }
}

export async function POST(request: Request) {
  const session = await access(request)
  if (!session.authorized) return session.response
  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Suscripción inválida" }, { status: 400 })
  const { endpoint, keys } = parsed.data

  // El endpoint identifica el navegador. Si otra cuenta lo tenía, se transfiere.
  const { error: deleteError } = await session.db.from("push_subscriptions").delete().eq("endpoint", endpoint)
  if (deleteError) return Response.json({ error: "No se pudo actualizar la suscripción" }, { status: 500 })
  const { error } = await session.db.from("push_subscriptions")
    .insert({ user_id: session.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
  if (error) return Response.json({ error: "No se pudo guardar la suscripción" }, { status: 500 })
  return Response.json({ active: true })
}

export async function DELETE(request: Request) {
  const session = await access(request)
  if (!session.authorized) return session.response
  const parsed = endpointSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Suscripción inválida" }, { status: 400 })
  const { error } = await session.db.from("push_subscriptions").delete()
    .eq("endpoint", parsed.data.endpoint).eq("user_id", session.userId)
  if (error) return Response.json({ error: "No se pudo retirar la suscripción" }, { status: 500 })
  return Response.json({ active: false })
}
