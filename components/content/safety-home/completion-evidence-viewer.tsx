"use client"

import { useState } from "react"
import { ArrowLeft, FileText, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { FindingPreview } from "./finding-card"
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

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className={activePdfUrl ? "sm:max-w-5xl" : undefined}>
        <DialogHeader><DialogTitle>Evidencia de cumplimiento</DialogTitle></DialogHeader>
        <p className="truncate text-body-md text-foreground" title={finding.title}>{finding.title}</p>
        {activePdfUrl ? (
          <div className="mt-4 flex min-h-0 flex-col gap-3">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setActivePdfIndex(null)}>
                <ArrowLeft aria-hidden="true" />Volver
              </Button>
            </div>
            <iframe
              src={activePdfUrl}
              title={`PDF ${(activePdfIndex ?? 0) + 1} de ${finding.title}`}
              className="h-[min(65dvh,48rem)] w-full rounded-md border border-border bg-card"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {finding.completionEvidencePaths.map((path, index) => {
              const url = finding.completionEvidences?.[index]
              if (!url) return null
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
        )}
      </DialogContent>
    </Dialog>
  )
}
