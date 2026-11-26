"use client"

import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { usePromociones } from "@/lib/hooks/usePromociones"
import PromocionesContent from "@/components/content/promociones"

export default function PromocionesClient() {
  const {
    empleados,
    loading,
    error,
    recargar,
    promoverEmpleado,
    guardarExamen,
  } = usePromociones()

  if (error && empleados.length === 0) {
    return (
      <Alert variant="destructive" className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <AlertDescription>Error al cargar datos: {error}</AlertDescription>
        </div>
        <Button type="button" variant="outline" size="sm" className="touch-target shrink-0" onClick={() => { void recargar() }}>
          Reintentar
        </Button>
      </Alert>
    )
  }

  return (
    <PromocionesContent
      empleados={empleados}
      loading={loading && empleados.length === 0}
      onDatosActualizados={recargar}
      promoverEmpleado={promoverEmpleado}
      guardarExamen={guardarExamen}
    />
  )
}
