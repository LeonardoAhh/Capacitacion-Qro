"use client"

import { ArrowLeft, FileQuestion } from "lucide-react"
import { ErrorState } from "@/components/ui/error-state"

export default function NotFound() {
  return (
    <ErrorState
      icon={FileQuestion}
      code="Error 404"
      title="Página no encontrada"
      description="La ruta que buscas fue movida o no existe. Revisa el enlace o vuelve al inicio."
      primaryAction={{ label: "Volver al inicio", icon: ArrowLeft, href: "/inicio" }}
    />
  )
}
