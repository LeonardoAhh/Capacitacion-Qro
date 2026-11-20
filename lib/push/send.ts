import { createECDH, timingSafeEqual } from "node:crypto"
import { sendNotification } from "web-push"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface PushSubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

export function pushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.VAPID_SUBJECT?.trim()
  if (!publicKey || !privateKey || !subject || !/^(mailto:|https:\/\/)/.test(subject)) return null
  try {
    const publicBytes = Buffer.from(publicKey, "base64url")
    const privateBytes = Buffer.from(privateKey, "base64url")
    if (publicBytes.length !== 65 || privateBytes.length !== 32) throw new Error("Invalid VAPID key length")
    const keyPair = createECDH("prime256v1")
    keyPair.setPrivateKey(privateBytes)
    const derivedPublicKey = keyPair.getPublicKey()
    if (derivedPublicKey.length !== publicBytes.length || !timingSafeEqual(derivedPublicKey, publicBytes)) {
      throw new Error("VAPID keys do not match")
    }
  } catch {
    console.error("[push] Las claves VAPID no forman un par válido")
    return null
  }
  return { publicKey, privateKey, subject }
}

export type PushConfig = NonNullable<ReturnType<typeof pushConfig>>

export interface DigestResult {
  sent: number
  expired: number
  failed: number
  skipped: number
}

/** Registro diario en push_sent_log para no repetir un resumen el mismo día. */
interface DigestClaim {
  ref_id: string
  ref_type: string
  days_before: number
  sent_at: string
}

/** true si se apartó el envío; false si ya se había enviado hoy. */
export async function claimDigest(db: SupabaseClient, claim: DigestClaim): Promise<boolean> {
  const { error } = await db.from("push_sent_log").insert(claim)
  if (error?.code === "23505") return false
  if (error) throw new Error(error.message)
  return true
}

/** Libera el registro si no se entregó nada, para reintentar en la siguiente ejecución. */
export async function releaseDigest(db: SupabaseClient, claim: DigestClaim): Promise<void> {
  const { error } = await db.from("push_sent_log").delete()
    .eq("ref_id", claim.ref_id).eq("ref_type", claim.ref_type)
    .eq("days_before", claim.days_before).eq("sent_at", claim.sent_at)
  if (error) throw new Error(error.message)
}

function errorStatus(error: unknown) {
  if (typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number") {
    return error.statusCode
  }
  return null
}

function errorReason(error: unknown) {
  if (typeof error !== "object" || error === null || !("body" in error) || typeof error.body !== "string") {
    return "sin-detalle"
  }
  const body = error.body
  if (/BadJwtToken/i.test(body)) return "bad-jwt-token"
  if (/VapidPkHashMismatch/i.test(body)) return "vapid-key-mismatch"
  if (/UnauthorizedRegistration/i.test(body)) return "unauthorized-registration"
  if (/SENDER_ID_MISMATCH/i.test(body)) return "sender-id-mismatch"
  if (/THIRD_PARTY_PERMISSION_DENIED/i.test(body)) return "permission-denied"
  if (/invalid JWT/i.test(body)) return "invalid-jwt"
  return "sin-detalle"
}

export async function sendPush(
  db: SupabaseClient,
  subscriptions: PushSubscriptionRow[],
  payload: string,
  config: PushConfig,
) {
  let sent = 0
  let expired = 0
  let failed = 0
  await Promise.all(subscriptions.map(async subscription => {
    try {
      await sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        payload,
        { vapidDetails: config, TTL: 86400, timeout: 10000 },
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
        console.error("[push] Falló el envío", {
          status: errorStatus(error),
          service: new URL(subscription.endpoint).hostname,
          reason: errorReason(error),
        })
      }
    }
  }))
  return { sent, expired, failed }
}
