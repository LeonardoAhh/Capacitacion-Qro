"use client"

import { useEffect, useRef } from "react"
import { CheckCircle2, Printer, UserRoundPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { UMBRAL_CALIFICACION_APROBATORIA } from "@/lib/types/desempeno"

interface DesempenoSaveSuccessProps {
  visible: boolean
  nombre?: string
  calificacion?: number
  onPrint: () => void
  onNew: () => void
  onEdit?: () => void
}

export function DesempenoSaveSuccess({ visible, nombre, calificacion, onPrint, onNew, onEdit }: DesempenoSaveSuccessProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!visible) return
    const frame = requestAnimationFrame(() => cardRef.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [visible])

  if (!visible) return null
  const approved = calificacion !== undefined && calificacion >= UMBRAL_CALIFICACION_APROBATORIA
  return <Card ref={cardRef} tabIndex={-1} role="status" aria-live="polite" className="outline-none print:hidden">
    <CardContent className="flex flex-col gap-4 p-(--card-padding) sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <CheckCircle2 className="mt-1 size-5 shrink-0 text-foreground" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-heading-md text-foreground">Evaluación guardada</h2>
          <p className="break-words text-body-md text-muted-foreground">{nombre ? `${nombre} · ` : ""}{calificacion !== undefined ? `${calificacion}% · ${approved ? "Resultado aprobatorio" : "Requiere seguimiento"}` : "Lista para imprimir"}</p>
          {onEdit && <button type="button" onClick={onEdit} className="mt-2 rounded-sm text-label-sm text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Corregir datos</button>}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:flex sm:shrink-0">
        <Button type="button" variant="outline" onClick={onNew}><UserRoundPlus aria-hidden="true" />Evaluar otra persona</Button>
        <Button type="button" onClick={onPrint}><Printer aria-hidden="true" />Imprimir</Button>
      </div>
    </CardContent>
  </Card>
}
