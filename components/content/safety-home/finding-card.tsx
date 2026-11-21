"use client"

import { useState } from "react"
import Image from "next/image"
import { EllipsisVertical, Image as ImageIcon, Maximize2, Pencil, Trash2 } from "lucide-react"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Button } from "@/components/ui/button"
import { Badge, badgeVariants } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { FINDING_PREVIEW_RATIO, type FindingDeadline } from "./finding-constraints"
import { FindingDescription } from "./finding-description"

export interface FindingPreview {
  id: string
  week: number
  year: number
  title: string
  description: string
  area: string
  date: string
  status: "Abierto" | "En seguimiento" | "Cerrado"
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
  index: number
  onExpand: (finding: FindingPreview) => void
  onExpandCompletion: (finding: FindingPreview) => void
  onManageCompletion: (finding: FindingPreview) => void
  onEdit: (finding: FindingPreview) => void
  onDelete: (finding: FindingPreview) => void
  canEdit: boolean
}

export function FindingCard({ finding, index, onExpand, onExpandCompletion, onManageCompletion, onEdit, onDelete, canEdit }: FindingCardProps) {
  const [isDescriptionTruncated, setIsDescriptionTruncated] = useState(false)
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false)
  const statusClassName =
    finding.status === "Abierto"
      ? "border-destructive/20 bg-destructive/10 text-destructive"
      : finding.status === "En seguimiento"
        ? "border-warning/30 bg-warning/10 text-warning-foreground"
        : "border-success/20 bg-success/10 text-success"
  const deadlineClassName =
    finding.deadline === "Corrección Inmediata"
      ? "border-destructive/20 bg-destructive/10 text-destructive"
      : finding.deadline === "1 semana"
        ? "border-warning/30 bg-warning/10 text-warning-foreground"
        : "border-urgency-low/30 bg-urgency-low/10 text-urgency-low"

  return (
    <article className="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-6 md:aspect-[21/9] md:min-h-max md:self-start">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate text-heading-md text-foreground" title={finding.title}>{finding.title}</h3>
          {isDescriptionTruncated && (
            <Button type="button" variant="ghost" size="xs"
              className="shrink-0 px-0 text-body-sm font-normal text-foreground underline underline-offset-4"
              onClick={() => setIsDescriptionOpen(true)}>
              Ver descripción
            </Button>
          )}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label={`Acciones para ${finding.title}`}>
                  <EllipsisVertical aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onManageCompletion(finding)}>
                  <ImageIcon aria-hidden="true" />Evidencia
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onEdit(finding)}>
                  <Pencil aria-hidden="true" />Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onDelete(finding)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <Trash2 aria-hidden="true" />Borrar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <FindingDescription title={finding.title} description={finding.description}
          isOpen={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}
          onTruncatedChange={setIsDescriptionTruncated} />
        <div className="mt-auto shrink-0 pt-2">
          <dl className="grid grid-cols-3 gap-4 text-body-sm">
            <div className="min-w-0">
              <dt className="text-muted-foreground">Fecha</dt>
              <dd className="mt-1 text-foreground">{finding.date}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-muted-foreground">Área</dt>
              <dd className="mt-1 truncate text-foreground" title={finding.area}>{finding.area}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-muted-foreground">Responsable</dt>
              <dd className="mt-1 truncate text-foreground" title={finding.responsible}>{finding.responsible ?? "—"}</dd>
            </div>
          </dl>
          <dl className="mt-4 grid grid-cols-3 gap-4 text-body-sm">
            <div className="min-w-0">
              <dt className="text-muted-foreground">Estado</dt>
              <dd className="mt-2">
                <Badge variant="outline" size="sm" className={`max-w-full whitespace-normal font-normal ${statusClassName}`}>
                  {finding.status}
                </Badge>
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-muted-foreground">Plazo</dt>
              <dd className="mt-2 text-foreground">
                {finding.deadline ? (
                  <Badge variant="outline" size="sm" className={`max-w-full whitespace-normal font-normal ${deadlineClassName}`}>
                    {finding.deadline}
                  </Badge>
                ) : "—"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-muted-foreground">Evidencia</dt>
              <dd className="mt-2 text-foreground">
                {finding.completionEvidencePaths.length > 0 ? (
                  <button type="button"
                    className={cn(
                      badgeVariants({ variant: "outline", size: "sm" }),
                      "relative touch-target max-w-full border-primary/20 bg-primary/10 font-normal text-primary hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:ring-0 focus-visible:ring-offset-0",
                    )}
                    aria-label={`Ver evidencia de cumplimiento de ${finding.title}`}
                    onClick={() => onExpandCompletion(finding)}>
                    Adjunto
                  </button>
                ) : (
                  <Badge variant="outline" size="sm" className="max-w-full border-border bg-muted font-normal text-muted-foreground">
                    Sin datos
                  </Badge>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        <button
          type="button"
          aria-label={`Ampliar evidencia del hallazgo ${index + 1}`}
          onClick={() => onExpand({
            ...finding,
            src: finding.src,
          })}
          className="group relative block w-full overflow-hidden rounded-xl border border-border bg-muted text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <AspectRatio
            ratio={FINDING_PREVIEW_RATIO}
            className="w-full rounded-xl"
          >
            <Image
              src={finding.src}
              alt={finding.alt}
              fill
              unoptimized
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02] group-focus-visible:scale-[1.02] motion-reduce:transform-none"
            />
            <span className="absolute bottom-3 right-3 hidden size-11 place-items-center rounded-md text-foreground sm:group-hover:grid sm:group-focus-visible:grid">
              <Maximize2 className="size-4" aria-hidden="true" />
            </span>
          </AspectRatio>
        </button>
      </div>
    </article>
  )
}
