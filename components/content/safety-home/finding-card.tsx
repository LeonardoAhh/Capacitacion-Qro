"use client"

import { useState, type CSSProperties } from "react"
import Image from "next/image"
import {
  ArrowRight, CircleAlert, CircleCheck, Clock3, EllipsisVertical, Hourglass, MapPin,
  Maximize2, Paperclip, Pencil, Trash2, UserRound, type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

const STATUS_META: Record<FindingPreview["status"], { icon: LucideIcon; className: string }> = {
  Abierto: { icon: CircleAlert, className: "border-destructive/20 bg-destructive/10 text-destructive" },
  "En seguimiento": { icon: Clock3, className: "border-warning/30 bg-warning/10 text-warning-foreground" },
  Cerrado: { icon: CircleCheck, className: "border-success/20 bg-success/10 text-success" },
}

const DEADLINE_CLASS: Record<FindingDeadline, string> = {
  "Corrección Inmediata": "border-destructive/20 bg-destructive/10 text-destructive",
  "1 semana": "border-warning/30 bg-warning/10 text-warning-foreground",
  "15 días": "border-urgency-low/30 bg-urgency-low/10 text-urgency-low",
}

const BADGE = "max-w-full gap-1 whitespace-normal font-normal [&_svg]:size-3 [&_svg]:shrink-0"

/** Dato con ícono: etiqueta pequeña y valor completo (sin cortar nombres largos). */
function Dato({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />{label}
      </dt>
      <dd className="mt-1 break-words text-label-sm text-foreground">{value}</dd>
    </div>
  )
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
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false)
  const status = STATUS_META[finding.status]
  const StatusIcon = status.icon
  const hasEvidence = finding.completionEvidencePaths.length > 0

  return (
    <article className="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-(--card-padding)">
        {/* Encabezado: contexto, título y estados; el menú queda aislado a la derecha. */}
        <header className="flex min-w-0 items-start gap-2">
          <div className="grid min-w-0 flex-1 gap-1">
            <p className="text-body-sm tabular-nums text-muted-foreground">Hallazgo {index + 1} · {finding.date}</p>
            <h3 className="line-clamp-2 break-words text-heading-md text-foreground" title={finding.title}>{finding.title}</h3>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline" size="sm" className={cn(BADGE, status.className)}>
                <StatusIcon aria-hidden="true" />{finding.status}
              </Badge>
              {finding.deadline && (
                <Badge variant="outline" size="sm" className={cn(BADGE, DEADLINE_CLASS[finding.deadline])}>
                  <Hourglass aria-hidden="true" /><span className="sr-only">Plazo: </span>{finding.deadline}
                </Badge>
              )}
            </div>
          </div>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="-mr-2 -mt-1 shrink-0" aria-label={`Acciones para ${finding.title}`}>
                  <EllipsisVertical aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
        </header>

        <FindingDescription title={finding.title} description={finding.description}
          isOpen={isDescriptionOpen} onOpenChange={setIsDescriptionOpen} />
        <div className="grid min-w-0 justify-items-start gap-1">
          <p className="w-full truncate text-body-md text-muted-foreground" title={finding.description}>{finding.description}</p>
          <Button type="button" variant="link" size="xs" className="gap-1 px-0 text-body-sm"
            aria-label={`Ver hallazgo ${finding.title}`} onClick={() => setIsDescriptionOpen(true)}>
            Ver hallazgo<ArrowRight aria-hidden="true" />
          </Button>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <Dato icon={MapPin} label="Área" value={finding.area} />
          <Dato icon={UserRound} label="Responsable" value={finding.responsible ?? "—"} />
        </dl>

        {/* Evidencia de cumplimiento: franja que invita a completar el pendiente. */}
        <div className={cn("mt-auto flex min-w-0 items-center gap-2 rounded-md border px-3 py-2",
          hasEvidence ? "border-border" : "border-dashed border-border bg-muted/40")}>
          <Paperclip className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-body-sm text-muted-foreground">
            {hasEvidence ? "Evidencia de cumplimiento adjunta" : "Sin evidencia de cumplimiento"}
          </p>
          {hasEvidence ? (
            <>
              {canEdit && (
                <Button type="button" variant="ghost" size="sm" className="shrink-0"
                  aria-label={`Cambiar evidencia de cumplimiento de ${finding.title}`}
                  onClick={() => onManageCompletion(finding)}>
                  Cambiar
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" className="shrink-0"
                aria-label={`Ver evidencia de cumplimiento de ${finding.title}`}
                onClick={() => onExpandCompletion(finding)}>
                Ver
              </Button>
            </>
          ) : canEdit && (
            <Button type="button" variant="outline" size="sm" className="shrink-0"
              aria-label={`Adjuntar evidencia de cumplimiento a ${finding.title}`}
              onClick={() => onManageCompletion(finding)}>
              Adjuntar
            </Button>
          )}
        </div>
      </div>

      {/* En escritorio la imagen toma el alto de la tarjeta; en celular conserva su proporción. */}
      <button
        type="button"
        aria-label={`Ampliar evidencia del hallazgo ${index + 1}`}
        onClick={() => onExpand(finding)}
        style={{ "--preview-ratio": FINDING_PREVIEW_RATIO } as CSSProperties}
        className="group relative block aspect-(--preview-ratio) w-full min-w-0 overflow-hidden rounded-xl border border-border bg-muted text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:aspect-auto lg:h-full"
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
      </button>
    </article>
  )
}
