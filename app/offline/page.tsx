"use client"

import { RotateCcw, WifiOff } from "lucide-react"
import { ErrorState } from "@/components/ui/error-state"

/**
 * Respaldo del service worker cuando falla una navegación sin red y no hay copia en caché.
 */
export default function OfflinePage() {
  return (
    <ErrorState
      icon={WifiOff}
      code="Sin conexión"
      title="No hay conexión a internet"
      description="Revisa tu red y vuelve a intentarlo. Las secciones visitadas recientemente siguen disponibles en caché."
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
