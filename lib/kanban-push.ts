"use client"

export const KANBAN_PUSH_SUBSCRIPTION_URL = "/api/kanban/push/subscription"

export function canUseKanbanPush() {
  return typeof window !== "undefined"
    && window.isSecureContext
    && "Notification" in window
    && "serviceWorker" in navigator
    && "PushManager" in window
    && Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
}

function vapidKeyBytes(key: string): Uint8Array<ArrayBuffer> {
  const normalized = key.replace(/-/g, "+").replace(/_/g, "/")
  const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="))
  return Uint8Array.from(decoded, char => char.charCodeAt(0))
}

function matchesVapidKey(subscription: PushSubscription, key: Uint8Array<ArrayBuffer>) {
  const current = subscription.options.applicationServerKey
  if (!current) return false
  const bytes = new Uint8Array(current)
  return bytes.length === key.length && bytes.every((value, index) => value === key[index])
}

async function updateServer(method: "POST" | "DELETE", subscription: PushSubscription) {
  const payload = subscription.toJSON()
  const response = await fetch(KANBAN_PUSH_SUBSCRIPTION_URL, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(method === "POST" ? payload : { endpoint: subscription.endpoint }),
  })
  if (!response.ok) throw new Error("No se pudo guardar la configuración de notificaciones.")
}

export async function activateKanbanPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!canUseKanbanPush() || !publicKey) throw new Error("Las notificaciones no están disponibles.")

  const permission = Notification.permission === "default"
    ? await Notification.requestPermission()
    : Notification.permission
  if (permission !== "granted") throw new Error("Permite las notificaciones en tu navegador.")

  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
  const key = vapidKeyBytes(publicKey)
  let subscription = await registration.pushManager.getSubscription()
  if (subscription && !matchesVapidKey(subscription, key)) {
    await subscription.unsubscribe()
    subscription = null
  }
  const isNew = !subscription
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })

  try {
    await updateServer("POST", subscription)
  } catch (error) {
    if (isNew) await subscription.unsubscribe()
    throw error
  }
}

export async function deactivateKanbanPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
  const registration = await navigator.serviceWorker.getRegistration("/")
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return

  try {
    await updateServer("DELETE", subscription)
  } finally {
    await subscription.unsubscribe()
  }
}
