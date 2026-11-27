"use client"

export const KANBAN_PUSH_SUBSCRIPTION_URL = "/api/kanban/push/subscription"

/**
 * Estado de las notificaciones push en este dispositivo:
 * - unavailable: el navegador no las admite (o faltan las llaves).
 * - needs-install: iPhone/iPad en Safari; solo funcionan con la app en la pantalla de inicio.
 * - denied: la persona las bloqueó en el navegador; solo se reactivan desde su configuración.
 * - inactive / active: se pueden activar / ya llegan a este dispositivo.
 */
export type KanbanPushState = "unavailable" | "needs-install" | "denied" | "inactive" | "active"

// Quién activó las notificaciones en este dispositivo. Solo esa persona las
// recupera sola al volver a entrar; si las desactiva, se borra y no se reactivan.
// En un equipo compartido, otra cuenta debe activarlas con su propio toque.
const OWNER_KEY = "kanban-push-usuario"

function readOwner(): string | null {
  try {
    return window.localStorage.getItem(OWNER_KEY)
  } catch {
    return null
  }
}

function writeOwner(userId: string | null) {
  try {
    if (userId) window.localStorage.setItem(OWNER_KEY, userId)
    else window.localStorage.removeItem(OWNER_KEY)
  } catch {
    // Sin almacenamiento: la persona tendría que volver a activarlas.
  }
}

export function canUseKanbanPush() {
  return typeof window !== "undefined"
    && window.isSecureContext
    && "Notification" in window
    && "serviceWorker" in navigator
    && "PushManager" in window
    && Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
}

/** iPhone o iPad (iPadOS se presenta como Mac con pantalla táctil) fuera de la app instalada. */
function needsInstall() {
  const appleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1)
  const standalone = window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
  return appleMobile && !standalone
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
  if (!response.ok) throw new Error("No se pudo guardar la configuración de notificaciones")
}

/**
 * Suscripción vigente con la llave actual. Si la del navegador usa otra llave
 * (se cambiaron las llaves VAPID), se reemplaza; si no hay, se crea solo cuando
 * `crear` lo permite.
 */
async function currentSubscription(crear: boolean): Promise<PushSubscription | null> {
  const key = vapidKeyBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string)
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
  let subscription = await registration.pushManager.getSubscription()
  if (subscription && !matchesVapidKey(subscription, key)) {
    await updateServer("DELETE", subscription).catch(() => undefined)
    await subscription.unsubscribe()
    subscription = null
  }
  if (!subscription && crear) {
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
  }
  return subscription
}

/**
 * Se llama al cargar la app: con el permiso ya concedido, vuelve a registrar la
 * suscripción en el servidor (o la renueva si el navegador la cambió). Así se
 * activa una sola vez por dispositivo. Nunca pide permiso.
 */
export async function syncKanbanPush(userId: string): Promise<KanbanPushState> {
  if (!canUseKanbanPush()) return needsInstall() ? "needs-install" : "unavailable"
  if (Notification.permission === "denied") return "denied"
  const owner = readOwner()
  if (Notification.permission !== "granted" || (owner !== null && owner !== userId)) return "inactive"
  // Solo se crea una suscripción nueva para quien las activó (Safari exige además un toque).
  // Sin dueño registrado (activadas antes de este cambio) se conserva la existente.
  const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  const subscription = await currentSubscription(owner === userId && !safari)
  if (!subscription) return "inactive"
  await updateServer("POST", subscription)
  writeOwner(userId)
  return "active"
}

/** Pide permiso (si hace falta) y activa este dispositivo. Debe llamarse desde un toque o clic. */
export async function activateKanbanPush(userId: string) {
  if (!canUseKanbanPush()) throw new Error("Las notificaciones no están disponibles en este navegador.")
  const permission = Notification.permission === "default"
    ? await Notification.requestPermission()
    : Notification.permission
  if (permission !== "granted") throw new Error("Permite las notificaciones en la configuración del navegador.")

  const before = await navigator.serviceWorker.getRegistration("/").then(registration => registration?.pushManager.getSubscription())
  const subscription = await currentSubscription(true)
  if (!subscription) throw new Error("No se pudieron activar las notificaciones")
  try {
    await updateServer("POST", subscription)
  } catch (error) {
    if (!before) await subscription.unsubscribe()
    throw error
  }
  writeOwner(userId)
}

/**
 * Al cerrar sesión: el servidor deja de enviar a este dispositivo, pero el
 * navegador conserva su suscripción. Al volver a entrar, syncKanbanPush la
 * registra otra vez sin pedir nada (también en Safari, que exige un toque para crearla).
 */
export async function releaseKanbanPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
  const registration = await navigator.serviceWorker.getRegistration("/")
  const subscription = await registration?.pushManager.getSubscription()
  if (subscription) await updateServer("DELETE", subscription)
}

/** Desactiva este dispositivo y recuerda la decisión para no reactivarlo solo. */
export async function deactivateKanbanPush() {
  writeOwner(null)
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
