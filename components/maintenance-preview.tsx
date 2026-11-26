"use client"

import { useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Eye, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MaintenanceScreen } from "@/components/maintenance-screen"

/**
 * Vista previa de la pantalla de mantenimiento a pantalla completa, con una cuenta regresiva
 * del tiempo elegido. No activa nada: en local el guardia nunca la muestra, así se revisa.
 * Es un diálogo propio para apilarse sobre el de Configuración (foco atrapado, Esc cierra).
 */
export function MaintenancePreview({ seconds }: { seconds: number | null }) {
  const [endsAt, setEndsAt] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        {/* La hora de fin se fija al abrir: la cuenta corre desde ese momento. */}
        <Button type="button" variant="outline" size="sm" className="touch-target"
          onClick={() => setEndsAt(seconds ? new Date(Date.now() + seconds * 1000).toISOString() : null)}>
          <Eye aria-hidden="true" />Ver
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content className="fixed inset-0 z-[300] overflow-y-auto bg-background" aria-describedby={undefined}>
          <DialogPrimitive.Title className="sr-only">Vista previa de la pantalla de mantenimiento</DialogPrimitive.Title>
          <MaintenanceScreen endsAt={endsAt} />
          <DialogPrimitive.Close asChild>
            <Button type="button" variant="outline" size="sm" className="touch-target fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 md:right-8 md:top-8">
              <X aria-hidden="true" />Cerrar vista previa
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
