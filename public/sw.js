// TIMESTAMP: 2026-11-25T20:25:39.666Z
const CACHE_NAME = "vinoplastic-v5"
const STATIC_CACHE = "vinoplastic-static-v5"
const API_CACHE = "vinoplastic-api-v5"

// Recursos a pre-cachear en la instalación. `/offline` es la ruta de
// fallback cuando una navegación falla y no hay copia en caché.
const PRECACHE_URLS = ["/inicio", "/login", "/offline", "/plantilla"]
const OFFLINE_URL = "/offline"

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
  )
})

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Solo interceptamos GET
  if (request.method !== "GET") return

  // Supabase → Network First (datos siempre frescos, fallback a cache)
  if (url.hostname.includes("supabase.co")) {
    event.respondWith(networkFirst(request, API_CACHE, 24 * 60 * 60))
    return
  }

  // Assets estáticos de Next.js → Network First
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(networkFirst(request, STATIC_CACHE, 365 * 24 * 60 * 60))
    return
  }

  // Páginas de la app → Network First con fallback
  if (url.origin === self.location.origin && !url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, STATIC_CACHE, 60 * 60))
    return
  }
})

// ─── Estrategias ──────────────────────────────────────────────────────────────

async function networkFirst(request, cacheName, maxAgeSeconds = 3600) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    if (request.destination === "document") {
      // Prefer the dedicated /offline route; fall back to the last-cached
      // home if the offline page isn't in the cache yet (first visit).
      const offlinePage = await caches.match(OFFLINE_URL)
      if (offlinePage) return offlinePage
      const rootCached = await caches.match("/inicio")
      if (rootCached) return rootCached
    }
    return new Response("Sin conexión", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }
}

// ─── Mensajes desde la app ─────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

// Avisos push enviados por las rutas protegidas del servidor.
self.addEventListener("push", (event) => {
  let payload = {}
  try {
    const received = event.data?.json()
    payload = received && typeof received === "object" ? received : {}
  } catch {
    // El aviso sigue siendo visible aunque el payload llegue incompleto.
  }
  const title = typeof payload.title === "string" ? payload.title : "Kanban"
  const body = typeof payload.body === "string" ? payload.body : "Tienes un aviso nuevo."
  const tag = typeof payload.tag === "string" ? payload.tag : "kanban-aviso"
  const url = typeof payload.url === "string" ? payload.url : "/kanban"

  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag,
    lang: "es-MX",
    icon: "/icons/icon-192-any.png",
    // Silueta monocromática para la barra de estado de Android.
    badge: "/icons/badge-96.png",
    timestamp: Date.now(),
    data: { url },
  }))
})

// El navegador puede renovar la suscripción (p. ej. Firefox). Se registra la nueva
// sin que la persona tenga que volver a activar las notificaciones.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil((async () => {
    const options = event.oldSubscription?.options
    const subscription = event.newSubscription
      ?? (options ? await self.registration.pushManager.subscribe(options) : null)
    if (!subscription) return
    await fetch("/api/kanban/push/subscription", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    })
  })())
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const requested = event.notification.data?.url
  let destination
  try {
    destination = new URL(typeof requested === "string" ? requested : "/kanban", self.location.origin)
  } catch {
    destination = new URL("/kanban", self.location.origin)
  }
  const allowedPath = destination.pathname === "/kanban" || destination.pathname === "/pendientes"
  const target = destination.origin === self.location.origin && allowedPath
    ? destination.href
    : new URL("/kanban", self.location.origin).href

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin)
    if (existing) {
      try {
        const navigated = existing.url === target ? existing : await existing.navigate(target)
        if (navigated) return navigated.focus()
      } catch {
        // Si la pestaña ya no puede navegar, se abre una nueva.
      }
    }
    return self.clients.openWindow(target)
  })())
})
