"use client"

import { useState } from "react"
import { Download, FileSpreadsheet } from "lucide-react"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { notify } from "@/lib/notify"

interface CapReportPreviewDialogProps {
  open: boolean
  onClose: () => void
  onDownload: () => Promise<void>
  employeeCount: number
  courseCount: number
}

export function CapReportPreviewDialog({
  open,
  onClose,
  onDownload,
  employeeCount,
  courseCount,
}: CapReportPreviewDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleClose = () => {
    if (!isDownloading) onClose()
  }

  const handleDownload = async () => {
    if (isDownloading) return
    setIsDownloading(true)
    try {
      await onDownload()
      notify.success("Reporte general descargado")
      onClose()
    } catch (error) {
      console.error("Error al generar reporte general:", error)
      notify.error("No se pudo generar el reporte general.")
    } finally {
      setIsDownloading(false)
    }
  }

  const isEmpty = employeeCount === 0 && courseCount === 0

  return (
    <ResponsiveShell
      open={open}
      onClose={handleClose}
      size="sm"
      title="Reporte general"
      description="Exporta en Excel una sola hoja con una fila por empleado y curso, conservando el intento más reciente."
    >
      <ModalHeader
        title="Reporte general"
        onClose={handleClose}
      />

      <div className="space-y-4 overflow-y-auto bg-card px-4 py-4 sm:px-6">
        <p className="text-body-md text-muted-foreground">
          Genera un Excel de una sola hoja con una fila por empleado y curso, conservando únicamente el intento más reciente.
        </p>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-label-sm text-foreground">Capacitación completa</p>
              <p className="text-body-sm text-muted-foreground">
                {isEmpty ? "Sin datos disponibles para exportar" : "Cursos requeridos y adicionales por empleado"}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-md border border-border bg-card px-2.5 py-1 text-body-sm font-medium tabular-nums text-foreground">
            {employeeCount.toLocaleString("es-MX")} emp · {courseCount.toLocaleString("es-MX")} cursos
          </span>
        </div>
      </div>

      <ModalFooter
        onCancel={handleClose}
        cancelLabel="Cancelar"
        onConfirm={handleDownload}
        saving={isDownloading}
        confirmLabel={isDownloading ? "Generando…" : "Descargar Excel"}
        confirmIcon={<Download className="size-4" aria-hidden="true" />}
        confirmDisabled={isEmpty}
      />
    </ResponsiveShell>
  )
}
