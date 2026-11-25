"use client"

import type { CSSProperties } from "react"
import { Maximize2, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DETAIL_SIDE_QUERY, SideDetailPanel } from "@/components/ui/side-detail-panel"
import type { FindingPreview } from "./finding-card"
import { FINDING_DETAIL_IMAGE_RATIO } from "./finding-constraints"
import { FindingBadges, FindingImage } from "./finding-parts"

/** Desde `lg` el detalle va a un lado de la lista (primitiva compartida). */
export const FINDING_DETAIL_SIDE_QUERY = DETAIL_SIDE_QUERY

interface FindingDetailProps {
  finding: FindingPreview
  index: number
  onClose: () => void
  onExpand: (finding: FindingPreview) => void
  /** Abre la evidencia de cumplimiento; el botón solo aparece cuando hay evidencia adjunta. */
  onViewCompletion: (finding: FindingPreview) => void
}

/** Contenido del panel; cerrar y el scroll los pone SideDetailPanel. */
function FindingDetail({
  finding, index, onExpand, onViewCompletion,
}: FindingDetailProps) {
  return (
    <>
      {finding.src ? (
        <button type="button" aria-label={`Ampliar evidencia del hallazgo ${index + 1}`} onClick={() => onExpand(finding)}
          style={{ "--preview-ratio": FINDING_DETAIL_IMAGE_RATIO } as CSSProperties}
          className="group relative block aspect-(--preview-ratio) w-full overflow-hidden bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
          <FindingImage src={finding.src} alt={finding.alt} sizes="(min-width: 1024px) 32rem, 100vw" />
          <span className="absolute bottom-2 right-2 hidden size-9 place-items-center rounded-md bg-card/80 text-foreground sm:group-hover:grid sm:group-focus-visible:grid">
            <Maximize2 className="size-4" aria-hidden="true" />
          </span>
        </button>
      ) : (
        <div className="h-(--control-height)" aria-hidden="true" />
      )}

      <div className="flex flex-col gap-3 p-(--card-padding)">
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
      </div>
    </>
  )
}

/**
 * Detalle del hallazgo seleccionado en la lista. Desde `lg` es una columna fija
 * junto a la lista; en pantallas chicas, una hoja inferior.
 */
export function FindingDetailPanel({ side, ...props }: FindingDetailProps & { side: boolean }) {
  return (
    <SideDetailPanel side={side} title={props.finding.title} description="Detalle del hallazgo" onClose={props.onClose}>
      <FindingDetail {...props} />
    </SideDetailPanel>
  )
}
