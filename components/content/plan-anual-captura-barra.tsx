"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { confirmUnsavedChanges, hasUnsavedChanges } from "@/lib/unsaved-changes"

/**
 * Encabezado de las páginas de captura del plan (cursos fijos, importar DNC):
 * descripción a la izquierda; acciones propias, Cancelar y acción principal a la derecha.
 */
export function PlanAnualCapturaBarra({ descripcion, acciones, volverHref, confirmLabel, onConfirm, saving, confirmDisabled }: {
  descripcion: string
  acciones?: ReactNode
  volverHref: string
  confirmLabel: string
  onConfirm: () => void
  saving: boolean
  confirmDisabled?: boolean
}) {
  const router = useRouter()
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <p className="mr-auto min-w-0 text-body-md text-muted-foreground">{descripcion}</p>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {acciones}
        <Button asChild variant="outline" size="sm">
          <Link href={volverHref} onNavigate={event => {
            // Con cambios sin guardar se confirma antes de salir, igual que en el header.
            if (!hasUnsavedChanges()) return
            event.preventDefault()
            void confirmUnsavedChanges().then(confirmed => { if (confirmed) router.push(volverHref) })
          }}>Cancelar</Link>
        </Button>
        <Button type="button" size="sm" onClick={onConfirm} loading={saving} disabled={saving || confirmDisabled}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  )
}
