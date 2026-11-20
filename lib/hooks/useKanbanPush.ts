"use client"

import { useCallback, useEffect, useState } from "react"
import { activateKanbanPush, deactivateKanbanPush, syncKanbanPush, type KanbanPushState } from "@/lib/kanban-push"

/**
 * Notificaciones push de este dispositivo. Al cargar se sincroniza en silencio
 * (sin pedir permiso), para que se activen una sola vez por dispositivo.
 * `checking` mientras se revisa; `saving` mientras se activa o desactiva.
 */
export function useKanbanPush(userId: string | null, activo: boolean) {
  const [state, setState] = useState<KanbanPushState | "checking" | "saving">("checking")

  useEffect(() => {
    if (!activo || !userId) return
    let mounted = true
    syncKanbanPush(userId)
      .then(next => { if (mounted) setState(next) })
      .catch(() => { if (mounted) setState("inactive") })
    return () => { mounted = false }
  }, [activo, userId])

  const activar = useCallback(async () => {
    if (!userId) return
    setState("saving")
    try {
      await activateKanbanPush(userId)
      setState("active")
    } catch (error) {
      setState(Notification.permission === "denied" ? "denied" : "inactive")
      throw error
    }
  }, [userId])

  const desactivar = useCallback(async () => {
    setState("saving")
    try {
      await deactivateKanbanPush()
    } finally {
      setState("inactive")
    }
  }, [])

  return { state, activar, desactivar }
}
