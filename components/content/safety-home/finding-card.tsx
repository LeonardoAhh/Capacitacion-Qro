"use client"

import { useState, type CSSProperties } from "react"
import { ArrowRight, Maximize2, MapPin, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  FINDING_PREVIEW_RATIO,
  UNASSIGNED_LABEL,
  type FindingDeadline,
  type FindingStatus,
} from "./finding-constraints"
import { FindingDescription } from "./finding-description"
import { CompletionEvidenceStrip, Dato, FindingActionsMenu, FindingBadges, FindingImage } from "./finding-parts"

export interface FindingPreview {
  id: string
  week: number
  year: number
  title: string
  description: string
  area: string
  date: string
  status: FindingStatus
  deadline: FindingDeadline | null
  responsible?: string
  src: string
  evidences?: string[]
  alt: string
  evidencePaths: string[]
  completionEvidencePaths: string[]
  completionEvidences?: string[]
}

interface FindingCardProps {
  finding: FindingPreview
  onExpand: (finding: FindingPreview) => void
  onExpandCompletion: (finding: FindingPreview) => void
  onManageCompletion: (finding: FindingPreview) => void
  onEdit: (finding: FindingPreview) => void
  onDelete: (finding: FindingPreview) => void
  canEdit: boolean
}

export function FindingCard({ finding, onExpand, onExpandCompletion, onManageCompletion, onEdit, onDelete, canEdit }: FindingCardProps) {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false)

  return (
    <article className="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
      <Card className="flex min-w-0 flex-col gap-3 p-(--card-padding)">
        <header className="flex min-w-0 items-start gap-2">
          <div className="grid min-w-0 flex-1 gap-1">
            <h2 className="line-clamp-2 break-words text-heading-md text-foreground" title={finding.title}>{finding.title}</h2>
            <p className="text-body-sm tabular-nums text-muted-foreground">{finding.date}</p>
            <FindingBadges finding={finding} />
          </div>
          {canEdit && <FindingActionsMenu finding={finding} onEdit={onEdit} onDelete={onDelete} className="-mr-2 -mt-1" />}
        </header>

        <FindingDescription title={finding.title} description={finding.description}
          isOpen={isDescriptionOpen} onOpenChange={setIsDescriptionOpen} />
        <div className="grid min-w-0 justify-items-start gap-1">
          <p className="w-full truncate text-body-md text-muted-foreground" title={finding.description}>{finding.description}</p>
          <Button type="button" variant="link" size="xs" className="gap-1 px-0 text-body-sm"
            aria-label={`Detalles de ${finding.title}`} onClick={() => setIsDescriptionOpen(true)}>
            Detalles<ArrowRight aria-hidden="true" />
          </Button>
        </div>

        <dl className="grid grid-cols-2 gap-3">
          <Dato icon={MapPin} label="Área" value={finding.area} />
          <Dato icon={UserRound} label="Responsable" value={finding.responsible || UNASSIGNED_LABEL} />
        </dl>

        <CompletionEvidenceStrip finding={finding} canEdit={canEdit} className="mt-auto"
          onView={onExpandCompletion} onManage={onManageCompletion} />
      </Card>

      {finding.src ? (
        <button
          type="button"
          aria-label={`Ampliar evidencia de ${finding.title}`}
          onClick={() => onExpand(finding)}
          style={{ "--preview-ratio": FINDING_PREVIEW_RATIO } as CSSProperties}
          className="group relative block aspect-(--preview-ratio) w-full min-w-0 overflow-hidden rounded-xl border border-border bg-muted text-left lg:aspect-auto lg:h-full"
        >
          <FindingImage src={finding.src} alt={finding.alt} sizes="(min-width: 1024px) 50vw, 100vw" />
          <span
            aria-hidden="true"
            className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-md border border-border bg-card/90 text-foreground sm:hidden sm:group-hover:grid sm:group-focus-visible:grid"
          >
            <Maximize2 className="size-4" />
          </span>
        </button>
      ) : (
        <div
          style={{ "--preview-ratio": FINDING_PREVIEW_RATIO } as CSSProperties}
          className="relative aspect-(--preview-ratio) w-full min-w-0 overflow-hidden rounded-xl border border-border bg-muted lg:aspect-auto lg:h-full"
        >
          <FindingImage src="" alt={finding.alt} sizes="(min-width: 1024px) 50vw, 100vw" />
        </div>
      )}
    </article>
  )
}
