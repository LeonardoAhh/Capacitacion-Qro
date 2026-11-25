"use client"

import type { CSSProperties } from "react"
import { Calendar, MapPin, Maximize2, Paperclip, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DETAIL_SIDE_QUERY, SideDetailPanel } from "@/components/ui/side-detail-panel"
import type { FindingPreview } from "./finding-card"
import { FINDING_DETAIL_IMAGE_RATIO, UNASSIGNED_LABEL } from "./finding-constraints"
import { Dato, FindingBadges, FindingImage } from "./finding-parts"

export const FINDING_DETAIL_SIDE_QUERY = DETAIL_SIDE_QUERY

interface FindingDetailProps {
  finding: FindingPreview
  onClose: () => void
  onExpand: (finding: FindingPreview) => void
  onViewCompletion: (finding: FindingPreview) => void
}

function FindingDetail({ finding, onExpand, onViewCompletion }: FindingDetailProps) {
  return (
    <>
      {finding.src ? (
        <button type="button" aria-label={`Ampliar evidencia de ${finding.title}`} onClick={() => onExpand(finding)}
          style={{ "--preview-ratio": FINDING_DETAIL_IMAGE_RATIO } as CSSProperties}
          className="group relative block aspect-(--preview-ratio) w-full overflow-hidden bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
          <FindingImage src={finding.src} alt={finding.alt} sizes="(min-width: 1024px) 32rem, 100vw" />
          <span
            aria-hidden="true"
            className="absolute bottom-2 right-2 grid size-9 place-items-center rounded-md border border-border bg-card/90 text-foreground sm:hidden sm:group-hover:grid sm:group-focus-visible:grid"
          >
            <Maximize2 className="size-4" />
          </span>
        </button>
      ) : (
        <div className="h-(--control-height)" aria-hidden="true" />
      )}

      <div className="flex flex-col gap-4 p-(--card-padding)">
        <div className="flex flex-wrap items-center gap-2">
          <FindingBadges finding={finding} />
          {finding.completionEvidencePaths.length > 0 && (
            <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => onViewCompletion(finding)}
              aria-label={`Ver evidencia de cumplimiento de ${finding.title}`}>
              <Paperclip aria-hidden="true" />Ver evidencia
            </Button>
          )}
        </div>
        <h2 className="break-words text-heading-md text-foreground">{finding.title}</h2>
        <p className="whitespace-pre-wrap break-words text-body-md text-muted-foreground">{finding.description}</p>
        <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3">
          <Dato icon={MapPin} label="Área" value={finding.area} />
          <Dato icon={UserRound} label="Responsable" value={finding.responsible || UNASSIGNED_LABEL} />
          <Dato icon={Calendar} label="Fecha" value={finding.date} />
        </dl>
      </div>
    </>
  )
}

export function FindingDetailPanel({ side, ...props }: FindingDetailProps & { side: boolean }) {
  return (
    <SideDetailPanel side={side} title={props.finding.title} description="Detalle del hallazgo" onClose={props.onClose}>
      <FindingDetail {...props} />
    </SideDetailPanel>
  )
}
