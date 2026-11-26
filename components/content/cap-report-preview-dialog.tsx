"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"

interface CapReportPreviewDialogProps {
  open: boolean
  onClose: () => void
  onDownload: () => Promise<void>
}

export function CapReportPreviewDialog({ open, onClose, onDownload }: CapReportPreviewDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await onDownload()
      onClose()
    } catch (error) {
      console.error(error)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <ResponsiveShell
      open={open}
      onClose={() => { if (!isDownloading) onClose() }}
      size="xs"
      title="Descargar reporte general"
    >
      <ModalHeader
        title="Descargar reporte general"
        onClose={() => { if (!isDownloading) onClose() }}
      />

      <div className="bg-card p-(--card-padding)">
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background">
            <Download className="size-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-body-md font-medium text-foreground">Reporte completo de capacitación</p>
            <p className="text-body-md text-muted-foreground">
              Se generará una sola hoja con una fila por empleado y curso, conservando únicamente el intento más reciente.
            </p>
          </div>
        </div>
      </div>

      <ModalFooter
        onCancel={() => { if (!isDownloading) onClose() }}
        cancelLabel="Cancelar"
        onConfirm={handleDownload}
        saving={isDownloading}
        confirmLabel="Descargar Excel"
        confirmIcon={<Download className="size-4" aria-hidden="true" />}
      />
    </ResponsiveShell>
  )
}
