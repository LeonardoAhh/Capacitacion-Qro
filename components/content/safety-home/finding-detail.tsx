"use client"

import type { CSSProperties } from "react"
import { ImageOff, Maximize2, Paperclip, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FloatingDetailPanel, type FloatingDetailNavigation } from "@/components/ui/floating-detail-panel"
import { DETAIL_SIDE_QUERY, SideDetailPanel } from "@/components/ui/side-detail-panel"
import { cn } from "@/lib/utils"
import { FINDING_DATE_LABEL, FINDING_DETAIL_IMAGE_RATIO, UNASSIGNED_LABEL, type FindingPreview } from "./finding-constraints"
import { FindingBadges, FindingImage } from "./finding-parts"

export const FINDING_DETAIL_SIDE_QUERY = DETAIL_SIDE_QUERY

interface FindingDetailProps {
  finding: FindingPreview
  onClose: () => void
  onExpand: (finding: FindingPreview) => void
  onViewCompletion: (finding: FindingPreview) => void
}

function inicialesDe(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return ""
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase()
}

/**
 * Tres estados responsivos cuando `columnas` está activo:
 * - Móvil (< md): foto full-bleed arriba, badges sobre el título y metadatos en 1 columna.
 * - Tablet (md): 2 columnas 50/50 con el título bajo la barra flotante para no apretarlo.
 * - Escritorio (lg+): 2 columnas 11:13 con foto enmarcada a la izquierda y datos a la derecha.
 */
function FindingDetail({
  finding,
  onExpand,
  onViewCompletion,
  columnas = false,
  hasNavigation = false,
}: FindingDetailProps & { columnas?: boolean; hasNavigation?: boolean }) {
  const hasCompletion = finding.completionEvidencePaths.length > 0
  const initials = finding.responsible ? inicialesDe(finding.responsible) : ""

  return (
    <div className={cn(
      columnas && "md:grid md:min-h-0 md:flex-1 md:grid-cols-2 md:grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,11fr)_minmax(0,13fr)]",
    )}>
      <div className={cn(columnas && "md:flex md:min-h-0 md:flex-col md:p-3 md:pr-0")}>
        <div className={cn(
          "relative overflow-hidden bg-muted",
          columnas
            ? "aspect-[16/10] w-full border-b border-border md:aspect-auto md:min-h-80 md:flex-1 md:rounded-md md:border lg:min-h-[26rem]"
            : "border-b border-border",
        )}>
          {finding.src ? (
            <button
              type="button"
              aria-label={`Ampliar evidencia de ${finding.title}`}
              onClick={() => onExpand(finding)}
              style={columnas ? undefined : ({ "--preview-ratio": FINDING_DETAIL_IMAGE_RATIO } as CSSProperties)}
              className={cn(
                "group relative block size-full cursor-pointer overflow-hidden focus-inset",
                !columnas && "aspect-(--preview-ratio) w-full",
              )}
            >
              <FindingImage
                src={finding.src}
                alt={finding.alt}
                sizes={columnas ? "(min-width: 1024px) 46vw, (min-width: 768px) 50vw, 100vw" : "(min-width: 1024px) 32rem, 100vw"}
              />
              <span
                aria-hidden="true"
                className="absolute bottom-2.5 right-2.5 grid size-(--control-height-sm) place-items-center rounded-md border border-border bg-card text-foreground transition-colors group-hover:bg-accent group-active:bg-accent motion-reduce:transition-none"
              >
                <Maximize2 className="size-4" />
              </span>
            </button>
          ) : (
            <div
              aria-hidden={!columnas || undefined}
              className={cn(
                "flex size-full flex-col items-center justify-center gap-2 p-6 text-muted-foreground",
                !columnas && "h-12 p-0",
              )}
            >
              {columnas && (
                <>
                  <ImageOff className="size-5" aria-hidden="true" />
                  <span className="text-body-sm">Sin fotografía</span>
                </>
              )}
            </div>
          )}

          {columnas && (
            <FindingBadges
              finding={finding}
              surface="solid"
              className="pointer-events-none absolute left-2.5 top-2.5 hidden md:flex [&>*]:pointer-events-auto"
            />
          )}
        </div>
      </div>

      <div className={cn("flex min-w-0 flex-col", columnas && "md:min-h-0")}>
        <div className={cn(
          "flex flex-1 flex-col gap-3 p-4 sm:gap-4 sm:p-5 lg:p-6",
          columnas && "md:min-h-0 md:overflow-y-auto md:overscroll-contain md:pt-14 lg:pt-6",
        )}>
          <FindingBadges finding={finding} className={cn(columnas && "md:hidden")} />

          <div className="space-y-2">
            <h2 className={cn(
              "break-words text-heading-md text-foreground sm:text-heading-lg",
              columnas && (hasNavigation ? "lg:pr-44" : "lg:pr-12"),
            )}>
              {finding.title}
            </h2>
            <p className="whitespace-pre-wrap break-words text-body-md text-muted-foreground">{finding.description}</p>
          </div>

          <dl className={cn("divide-y divide-border border-t border-border", columnas && "md:mt-auto")}>
            <div className="flex items-center gap-3 py-3">
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full bg-muted text-body-sm font-medium",
                  initials ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {initials || <UserRound className="size-4" />}
              </span>
              <div className="min-w-0">
                <dt className="text-body-sm text-muted-foreground">Responsable</dt>
                <dd className="break-words text-label-sm text-foreground">{finding.responsible || UNASSIGNED_LABEL}</dd>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2 sm:gap-4">
              <div className="min-w-0">
                <dt className="text-body-sm text-muted-foreground">Área</dt>
                <dd className="mt-0.5 break-words text-label-sm text-foreground">{finding.area}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-body-sm text-muted-foreground">{FINDING_DATE_LABEL}</dt>
                <dd className="mt-0.5 text-label-sm tabular-nums text-foreground">{finding.date}</dd>
              </div>
            </div>
          </dl>

          {hasCompletion && (
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onViewCompletion(finding)}
                aria-label={`Ver evidencia de cumplimiento de ${finding.title}`}
              >
                <Paperclip aria-hidden="true" />Ver evidencia
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Detalle flotante y centrado sobre la lista completa, con ‹ › para recorrer los hallazgos. */
export function FindingFloatingPanel({ navigation, ...props }: FindingDetailProps & { navigation: FloatingDetailNavigation }) {
  return (
    <FloatingDetailPanel title={props.finding.title} description="Detalle del hallazgo" onClose={props.onClose} navigation={navigation} size="lg" ownScroll>
      <FindingDetail {...props} columnas hasNavigation={navigation.total > 1} />
    </FloatingDetailPanel>
  )
}

/** Diseño anterior (columna junto a la lista); se conserva mientras se pule el flotante. */
export function FindingDetailPanel({ side, ...props }: FindingDetailProps & { side: boolean }) {
  return (
    <SideDetailPanel side={side} title={props.finding.title} description="Detalle del hallazgo" onClose={props.onClose}>
      <FindingDetail {...props} />
    </SideDetailPanel>
  )
}
