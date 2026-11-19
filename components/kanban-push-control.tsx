"use client"

import { useEffect, useState } from "react"
import { BellOff, BellRing } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { notify } from "@/lib/notify"
import { activateKanbanPush, canUseKanbanPush, deactivateKanbanPush } from "@/lib/kanban-push"

type PushState = "checking" | "unavailable" | "denied" | "inactive" | "active" | "saving"

export function KanbanPushControl({ userId }: { userId: string }) {
  const [state, setState] = useState<PushState>("checking")

  useEffect(() => {
    let mounted = true
    async function check() {
      if (!canUseKanbanPush()) {
        if (mounted) setState("unavailable")
        return
      }
      if (Notification.permission === "denied") {
        if (mounted) setState("denied")
        return
      }
      const registration = await navigator.serviceWorker.getRegistration("/")
      const subscription = await registration?.pushManager.getSubscription()
      if (!subscription) {
        if (mounted) setState("inactive")
        return
      }
      const { data, error } = await supabase.from("push_subscriptions").select("id")
        .eq("user_id", userId).eq("endpoint", subscription.endpoint).maybeSingle()
      if (error) throw error
      if (mounted) setState(data ? "active" : "inactive")
    }
    void check().catch(() => { if (mounted) setState("inactive") })
    return () => { mounted = false }
  }, [userId])

  async function toggle() {
    const wasActive = state === "active"
    setState("saving")
    try {
      if (wasActive) await deactivateKanbanPush()
      else await activateKanbanPush()
      setState(wasActive ? "inactive" : "active")
      notify.success(wasActive ? "Notificaciones desactivadas." : "Notificaciones activadas.")
    } catch (error) {
      setState(Notification.permission === "denied" ? "denied" : "inactive")
      notify.error(error instanceof Error ? error.message : "No se pudieron configurar las notificaciones.")
    }
  }

  const isActive = state === "active"
  if (state === "checking" || state === "unavailable") return null

  const isDisabled = state === "saving" || state === "denied"
  const label = state === "denied" ? "Notificaciones bloqueadas"
    : state === "saving" ? "Configurando notificaciones…"
    : isActive ? "Desactivar notificaciones" : "Activar notificaciones"

  return (
    <div className="border-t border-border">
      <Button type="button" variant="ghost" className="w-full justify-start rounded-none px-3 text-foreground"
        disabled={isDisabled} onClick={() => void toggle()}>
        {isActive ? <BellOff aria-hidden="true" /> : <BellRing aria-hidden="true" />}
        {label}
      </Button>
    </div>
  )
}
