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

      <div className="space-y-3 bg-card px-4 py-4 sm:px-6">
        <p className="text-body-md text-muted-foreground">
          Una fila por empleado y curso, solo el último intento.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3">
          <span className="flex items-center gap-2 text-label-sm text-foreground">
            <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {isEmpty ? "Sin datos" : "Capacitación"}
          </span>
          <span className="text-body-sm tabular-nums text-muted-foreground">
            {employeeCount.toLocaleString("es-MX")} empleados · {courseCount.toLocaleString("es-MX")} cursos
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
