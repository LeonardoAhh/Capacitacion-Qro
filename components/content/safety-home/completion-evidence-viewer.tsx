"use client"

import { useState } from "react"
import { ArrowLeft, ExternalLink, FileText, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { FindingPreview } from "./finding-constraints"
import { isPdfPath } from "./finding-file-types"

interface CompletionEvidenceViewerProps {
  finding: FindingPreview
  onClose: () => void
  onOpenImage: (src: string, evidences: string[]) => void
}

export function CompletionEvidenceViewer({ finding, onClose, onOpenImage }: CompletionEvidenceViewerProps) {
  const [activePdfIndex, setActivePdfIndex] = useState<number | null>(null)
  const activePdfUrl = activePdfIndex === null ? null : finding.completionEvidences?.[activePdfIndex]
  const imageUrls = finding.completionEvidencePaths.flatMap((path, index) => {
    const url = finding.completionEvidences?.[index]
    return url && !isPdfPath(path) ? [url] : []
  })
  const availableItems = finding.completionEvidencePaths
    .map((path, index) => ({ path, index, url: finding.completionEvidences?.[index] ?? "" }))
    .filter((item) => Boolean(item.url))

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className={cn(activePdfUrl && "h-[85dvh] sm:h-[80dvh] sm:max-w-5xl")}>
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="flex-row items-center gap-2">
            {activePdfUrl && (
              <Button type="button" variant="ghost" size="icon" className="-ml-2 shrink-0"
                aria-label="Volver a las evidencias" onClick={() => setActivePdfIndex(null)}>
                <ArrowLeft aria-hidden="true" />
              </Button>
            )}
            <DialogTitle className="min-w-0 flex-1 truncate">Evidencia de cumplimiento</DialogTitle>
            {activePdfUrl && (
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <a href={activePdfUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden="true" />Abrir PDF
                </a>
              </Button>
            )}
            <DialogDescription className="sr-only">{finding.title}</DialogDescription>
          </DialogHeader>
          {activePdfUrl ? (
            <iframe
              src={activePdfUrl}
              title={`PDF ${(activePdfIndex ?? 0) + 1} de ${finding.title}`}
              className="mt-2 min-h-0 w-full flex-1 rounded-md border border-border bg-card"
              referrerPolicy="no-referrer"
            />
          ) : availableItems.length > 0 ? (
            <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {availableItems.map(({ path, index, url }) => {
                const isPdf = isPdfPath(path)
                return (
                  <li key={path}>
                    <Button type="button" variant="outline" className="w-full justify-start gap-3 px-3 font-normal"
                      aria-label={`Ver ${isPdf ? "PDF" : "imagen"} ${index + 1} de ${finding.title}`}
                      onClick={() => isPdf ? setActivePdfIndex(index) : onOpenImage(url, imageUrls)}>
                      {isPdf ? <FileText aria-hidden="true" /> : <ImageIcon aria-hidden="true" />}
                      <span className="min-w-0 flex-1 text-left">{isPdf ? "PDF" : "Imagen"} {index + 1}</span>
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-4 text-body-md text-muted-foreground">No hay evidencias disponibles para mostrar.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
