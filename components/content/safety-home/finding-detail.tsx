"use client"

import type { CSSProperties } from "react"
import { Maximize2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import type { FindingPreview } from "./finding-card"
import { FINDING_DETAIL_IMAGE_RATIO } from "./finding-constraints"
import { FindingBadges, FindingImage } from "./finding-parts"

/** Igual al breakpoint `lg`: desde aquí el detalle va a un lado de la lista. */
export const FINDING_DETAIL_SIDE_QUERY = "(min-width: 64rem)"

interface FindingDetailProps {
  finding: FindingPreview
  index: number
  onClose: () => void
  onExpand: (finding: FindingPreview) => void
}

function FindingDetail({
  finding, index, onClose, onExpand,
}: FindingDetailProps) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Cerrar flota sobre la imagen (fuera del scroll) para que ella encabece el panel. */}
      <Button type="button" variant="ghost" size="icon" aria-label="Cerrar detalle" onClick={onClose}
        className="absolute right-2 top-2 z-10">
        <X aria-hidden="true" />
      </Button>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
          <FindingBadges finding={finding} />
          <h2 className="break-words text-heading-md text-foreground">{finding.title}</h2>
          <p className="whitespace-pre-wrap break-words text-body-md text-muted-foreground">{finding.description}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Detalle del hallazgo seleccionado en la lista. Desde `lg` es una columna fija
 * junto a la lista; en pantallas chicas, una hoja inferior.
 */
export function FindingDetailPanel({ side, ...props }: FindingDetailProps & { side: boolean }) {
  if (side) {
    return (
      <aside aria-label={`Detalle: ${props.finding.title}`}
        className="sticky top-0 flex max-h-[calc(100dvh-var(--workspace-header-height)-2*var(--workspace-inset)-2*var(--workspace-content-padding-y))] min-w-0 flex-col self-start overflow-hidden rounded-xl border border-border bg-card">
        <FindingDetail {...props} />
      </aside>
    )
  }

  return (
    <Drawer open shouldScaleBackground={false} onOpenChange={(open) => { if (!open) props.onClose() }}>
      <DrawerContent raw>
        <DrawerTitle className="sr-only">{props.finding.title}</DrawerTitle>
        <DrawerDescription className="sr-only">Detalle del hallazgo</DrawerDescription>
        <FindingDetail {...props} />
      </DrawerContent>
    </Drawer>
  )
}
