import { sendNotification } from "web-push"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface PushSubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

export function pushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject || !/^(mailto:|https:\/\/)/.test(subject)) return null
  return { publicKey, privateKey, subject }
}

function errorStatus(error: unknown) {
  if (typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number") {
    return error.statusCode
  }
  return null
}

export async function sendPush(
  db: SupabaseClient,
  subscriptions: PushSubscriptionRow[],
  payload: string,
  config: NonNullable<ReturnType<typeof pushConfig>>,
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
        console.error("[push] Falló el envío", errorStatus(error))
      }
    }
  }))
  return { sent, expired, failed }
}
