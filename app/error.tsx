"use client"

import { useEffect } from "react"
import { AlertCircle, ArrowLeft, RotateCcw } from "lucide-react"
import { ErrorState } from "@/components/ui/error-state"

/**
 * Error boundary de rutas: comparte superficie, tipografía y tokens con
 * 404, sin conexión y mantenimiento.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[app/error]", error)
  }, [error])

  const code = error.digest ? `#${error.digest}` : null

  return (
    <ErrorState
      icon={AlertCircle}
      tone="destructive"
      code="Error inesperado"
      title="Algo salió mal"
      description="No pudimos mostrar esta sección. Intenta de nuevo; si el problema continúa, recarga la página."
      primaryAction={{ label: "Reintentar", icon: RotateCcw, onClick: reset }}
      secondaryAction={{ label: "Ir al inicio", icon: ArrowLeft, href: "/inicio" }}
    >
      {code && (
        <p className="w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-body-sm tabular-nums text-muted-foreground">
          Código de referencia: <span className="font-medium text-foreground">{code}</span>
        </p>
      )}
    </ErrorState>
  )
}
