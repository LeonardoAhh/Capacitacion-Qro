"use client"

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react"

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "applying"
  | "up-to-date"

export const APP_UPDATE_COMPLETED_KEY = "app-update-completed"

// Shared store so multiple callers read one SW update state without duplicating listeners.
let status: UpdateStatus = "idle"
const listeners = new Set<() => void>()

function getStatus() { return status }
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb) } }
function setStatus(next: UpdateStatus) { status = next; listeners.forEach((cb) => cb()) }

async function getRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!("serviceWorker" in navigator)) return undefined
  return navigator.serviceWorker.getRegistration()
}

function activateWaitingWorker() {
  getRegistration().then((reg) => {
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" })
    } else {
      window.location.reload()
    }
  })
}

export function useAppUpdate() {
  const currentStatus = useSyncExternalStore(subscribe, getStatus, getStatus)
  const upToDateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const applyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    let cancelled = false
    let reg: ServiceWorkerRegistration | undefined

    const onUpdateFound = () => {
      const installing = reg?.installing
      if (!installing) return
      const onStateChange = () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          setStatus("available")
        }
      }
      installing.addEventListener("statechange", onStateChange)
    }

    const onControllerChange = () => {
      if (getStatus() === "applying") {
        try {
          sessionStorage.setItem(APP_UPDATE_COMPLETED_KEY, "1")
        } catch {
          // Storage unavailable in restricted browser contexts.
        }
      }
      window.location.reload()
    }

    navigator.serviceWorker.getRegistration().then((r) => {
      if (cancelled || !r) return
      reg = r
      if (r.waiting && navigator.serviceWorker.controller) {
        setStatus("available")
      }
      r.addEventListener("updatefound", onUpdateFound)
    })

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)

    return () => {
      cancelled = true
      reg?.removeEventListener("updatefound", onUpdateFound)
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
    }
  }, [])

  const checkForUpdate = useCallback(async () => {
    const current = getStatus()
    if (current === "checking" || current === "applying") return

    if (upToDateTimerRef.current) clearTimeout(upToDateTimerRef.current)
    setStatus("checking")

    const reg = await getRegistration()

    if (!reg) {
      setStatus("up-to-date")
      upToDateTimerRef.current = setTimeout(() => setStatus("idle"), 4000)
      return
    }

    if (reg.waiting && navigator.serviceWorker.controller) {
      setStatus("available")
      return
    }

    try {
      await reg.update()
    } catch {
      // Offline during manual check: stay non-blocking and settle as up-to-date.
    }

    await new Promise((resolve) => setTimeout(resolve, 2000))

    if (getStatus() === "checking") {
      setStatus("up-to-date")
      upToDateTimerRef.current = setTimeout(() => setStatus("idle"), 4000)
    }
  }, [])

  const applyUpdate = useCallback(() => {
    if (getStatus() === "applying") return
    setStatus("applying")
    // Delay reload briefly so the applying state is perceptible.
    applyTimerRef.current = setTimeout(() => activateWaitingWorker(), 600)
  }, [])

  useEffect(() => () => {
    if (upToDateTimerRef.current) clearTimeout(upToDateTimerRef.current)
    if (applyTimerRef.current) clearTimeout(applyTimerRef.current)
  }, [])

  return { status: currentStatus, checkForUpdate, applyUpdate, getLatestStatus: getStatus } as const
}
