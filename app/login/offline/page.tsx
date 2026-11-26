"use client"

import { RotateCcw, WifiOff } from "lucide-react"
import { ErrorState } from "@/components/ui/error-state"

/**
 * Respaldo del service worker para /login sin red.
 */
export default function OfflineLoginPage() {
  return (
    <ErrorState
      icon={WifiOff}
      code="Sin conexión"
      title="No hay conexión a internet"
      description="Para iniciar sesión necesitas conexión a la red. Revisa tu conexión y vuelve a intentarlo."
      tone="warning"
      primaryAction={{
        label: "Reintentar",
        icon: RotateCcw,
        onClick: () => {
          if (typeof window !== "undefined") window.location.reload()
        },
      }}
    />
  )
}
