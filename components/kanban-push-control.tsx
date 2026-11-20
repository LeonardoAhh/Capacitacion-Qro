"use client"

import { BellRing, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { KanbanPushState } from "@/lib/kanban-push"

const HINT = "border-t border-border px-3 py-2 text-body-sm text-muted-foreground"

/**
 * Pie del panel de avisos. Solo aparece cuando hay algo que hacer en este
 * dispositivo; una vez activas, se desactivan desde el encabezado del panel.
 */
export function KanbanPushControl({ state, onActivate }: {
  state: KanbanPushState | "checking" | "saving"
  onActivate: () => void
}) {
  if (state === "needs-install") {
    return <p className={HINT}>Para recibir notificaciones, agrega la app a tu pantalla de inicio.</p>
  }
  if (state === "denied") {
    return <p className={HINT}>Notificaciones bloqueadas. Permítelas en la configuración del navegador.</p>
  }
  if (state !== "inactive" && state !== "saving") return null

  const saving = state === "saving"
  return (
    <div className="border-t border-border">
      <Button type="button" variant="ghost" className="w-full justify-start rounded-none px-3 text-body-sm text-foreground"
        disabled={saving} aria-busy={saving || undefined} onClick={onActivate}>
        {saving
          ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          : <BellRing aria-hidden="true" />}
        {saving ? "Activando…" : "Activar notificaciones en este dispositivo"}
      </Button>
    </div>
  )
}
