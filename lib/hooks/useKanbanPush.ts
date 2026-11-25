"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { activateKanbanPush, deactivateKanbanPush, syncKanbanPush, type KanbanPushState } from "@/lib/kanban-push"

export type KanbanPushHookState = KanbanPushState | "checking" | "activating" | "deactivating"

/**
 * Notificaciones push de este dispositivo. Al cargar se sincroniza en silencio
 * (sin pedir permiso), para que se activen una sola vez por dispositivo.
 */
export function useKanbanPush(userId: string | null, activo: boolean) {
  const [state, setState] = useState<KanbanPushHookState>("checking")
  const busyRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!activo || !userId) {
      setState("checking")
      return
    }
    let active = true
    setState("checking")
    syncKanbanPush(userId)
      .then(next => { if (active) setState(next) })
      .catch(() => { if (active) setState("inactive") })
    return () => { active = false }
  }, [activo, userId])

  const activar = useCallback(async () => {
    if (!userId || busyRef.current) return
    busyRef.current = true
    setState("activating")
    try {
      await activateKanbanPush(userId)
      if (mountedRef.current) setState("active")
    } catch (error) {
      if (mountedRef.current) {
        const denied = typeof Notification !== "undefined" && Notification.permission === "denied"
        setState(denied ? "denied" : "inactive")
      }
      throw error
    } finally {
      busyRef.current = false
    }
  }, [userId])

  const desactivar = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setState("deactivating")
    try {
      await deactivateKanbanPush()
    } finally {
      busyRef.current = false
      if (mountedRef.current) setState("inactive")
    }
  }, [])

  return { state, activar, desactivar }
}
