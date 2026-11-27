"use client"

import { BellRing } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { KanbanPushHookState } from "@/lib/hooks/useKanbanPush"

const HINT = "border-t border-border px-3 py-2 text-body-sm text-muted-foreground"

/**
 * Pie del panel de avisos. Solo aparece cuando hay algo que hacer en este
 * dispositivo; una vez activas, se desactivan desde el encabezado del panel.
 */
export function KanbanPushControl({ state, onActivate }: {
  state: KanbanPushHookState
  onActivate: () => void
}) {
  if (state === "needs-install") {
    return <p className={HINT}>Para recibir notificaciones, agrega la app a tu pantalla de inicio.</p>
  }
  if (state === "denied") {
    return <p className={HINT}>Notificaciones bloqueadas. Permítelas en la configuración del navegador.</p>
  }
  if (state !== "inactive" && state !== "activating") return null

  const activating = state === "activating"
  return (
    <div className="border-t border-border">
      <Button
        type="button"
        variant="ghost"
        className="w-full justify-start rounded-none px-3 text-body-sm text-foreground focus-inset"
        loading={activating}
        onClick={onActivate}
      >
        <BellRing aria-hidden="true" />
        Activar notificaciones en este dispositivo
      </Button>
    </div>
  )
}
