"use client"

import { useState } from "react"
import Image from "next/image"
import {
  CircleAlert, CircleCheck, Clock3, EllipsisVertical, Hourglass, Paperclip, Pencil, Trash2, type LucideIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { FindingPreview } from "./finding-card"
import type { FindingDeadline } from "./finding-constraints"

/** Piezas compartidas por la tarjeta, la lista y el panel de detalle del hallazgo. */

const STATUS_META: Record<FindingPreview["status"], { icon: LucideIcon; className: string }> = {
  Abierto: { icon: CircleAlert, className: "border-destructive/20 bg-destructive/10 text-destructive" },
  "En seguimiento": { icon: Clock3, className: "border-warning/30 bg-warning/10 text-warning-deep" },
  Cerrado: { icon: CircleCheck, className: "border-success/20 bg-success/10 text-success" },
}

const DEADLINE_CLASS: Record<FindingDeadline, string> = {
  "Corrección Inmediata": "border-destructive/20 bg-destructive/10 text-destructive",
  "1 semana": "border-warning/30 bg-warning/10 text-warning-deep",
  "15 días": "border-urgency-low/30 bg-urgency-low/10 text-urgency-low",
}

const BADGE = "max-w-full gap-1 font-normal [&_svg]:size-3 [&_svg]:shrink-0"

/** Estatus y plazo del hallazgo. `nowrap`: en una línea, recortados si no caben (tablas). */
export function FindingBadges({ finding, nowrap = false, className }: { finding: FindingPreview; nowrap?: boolean; className?: string }) {
  const status = STATUS_META[finding.status]
  const StatusIcon = status.icon
  const badge = cn(BADGE, nowrap ? "whitespace-nowrap [&>span:last-child]:min-w-0 [&>span:last-child]:truncate" : "whitespace-normal")
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Badge variant="outline" size="sm" className={cn(badge, status.className)} title={finding.status}>
        <StatusIcon aria-hidden="true" /><span>{finding.status}</span>
      </Badge>
      {finding.deadline && (
        <Badge variant="outline" size="sm" className={cn(badge, DEADLINE_CLASS[finding.deadline])} title={`Plazo: ${finding.deadline}`}>
          <Hourglass aria-hidden="true" /><span><span className="sr-only">Plazo: </span>{finding.deadline}</span>
        </Badge>
      )}
    </div>
  )
}

interface FindingImageProps {
  src: string
  alt: string
  sizes: string
}

/**
 * Imagen del hallazgo (llena su contenedor `relative`): skeleton mientras carga
 * y aparición suave; se reinicia si cambia la imagen.
 */
export function FindingImage(props: FindingImageProps) {
  return <FindingImageLoader key={props.src} {...props} />
}

function FindingImageLoader({ src, alt, sizes }: FindingImageProps) {
  const [loaded, setLoaded] = useState(false)
  return (
    <>
      {!loaded && <Skeleton className="absolute inset-0 rounded-none" aria-hidden="true" />}
      <Image src={src} alt={alt} fill unoptimized sizes={sizes}
        onLoad={() => setLoaded(true)} onError={() => setLoaded(true)}
        className={cn(
          "object-cover transition-[opacity,transform] duration-200 ease-out group-hover:scale-[1.02] group-focus-visible:scale-[1.02] motion-reduce:transform-none",
          loaded ? "opacity-100" : "opacity-0",
        )} />
    </>
  )
}

/** Dato con ícono: etiqueta pequeña y valor completo (sin cortar nombres largos). */
export function Dato({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />{label}
      </dt>
      <dd className="mt-1 break-words text-label-sm text-foreground">{value}</dd>
    </div>
  )
}

/** "Con evidencia" / "Sin evidencia" de cumplimiento (lista y detalle). */
export function CompletionEvidenceBadge({ finding }: { finding: FindingPreview }) {
  const hasEvidence = finding.completionEvidencePaths.length > 0
  return (
    <Badge variant="outline" size="sm" className={cn("gap-1 whitespace-nowrap font-normal [&_svg]:size-3",
      hasEvidence ? "text-foreground" : "border-dashed text-muted-foreground")}>
      <Paperclip aria-hidden="true" />{hasEvidence ? "Con evidencia" : "Sin evidencia"}
    </Badge>
  )
}

interface FindingActionsMenuProps {
  finding: FindingPreview
  onEdit: (finding: FindingPreview) => void
  onDelete: (finding: FindingPreview) => void
  /** Adjuntar o cambiar la evidencia de cumplimiento (la lista no tiene la franja de la tarjeta). */
  onManageCompletion?: (finding: FindingPreview) => void
  className?: string
}

/** Menú ⋮ con Editar, evidencia de cumplimiento (opcional) y Borrar; solo para quien gestiona Seguridad e Higiene. */
export function FindingActionsMenu({ finding, onEdit, onDelete, onManageCompletion, className }: FindingActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className={cn("shrink-0", className)} aria-label={`Acciones para ${finding.title}`}>
          <EllipsisVertical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onEdit(finding)}>
          <Pencil aria-hidden="true" />Editar
        </DropdownMenuItem>
        {onManageCompletion && (
          <DropdownMenuItem onSelect={() => onManageCompletion(finding)}>
            <Paperclip aria-hidden="true" />
            {finding.completionEvidencePaths.length > 0 ? "Cambiar evidencia" : "Adjuntar evidencia"}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onDelete(finding)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
          <Trash2 aria-hidden="true" />Borrar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface CompletionEvidenceStripProps {
  finding: FindingPreview
  canEdit: boolean
  onView: (finding: FindingPreview) => void
  onManage: (finding: FindingPreview) => void
  className?: string
}

/** Evidencia de cumplimiento: franja que invita a completar el pendiente. */
export function CompletionEvidenceStrip({ finding, canEdit, onView, onManage, className }: CompletionEvidenceStripProps) {
  const hasEvidence = finding.completionEvidencePaths.length > 0
  return (
    <div className={cn("flex min-w-0 items-center gap-2 rounded-md border px-3 py-1.5",
      hasEvidence ? "border-border" : "border-dashed border-border bg-muted/40", className)}>
      <Paperclip className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-body-sm text-muted-foreground">
        {hasEvidence ? "Evidencia de cumplimiento adjunta" : "Sin evidencia de cumplimiento"}
      </p>
      {hasEvidence ? (
        <>
          {canEdit && (
            <Button type="button" variant="ghost" size="sm" className="shrink-0"
              aria-label={`Cambiar evidencia de cumplimiento de ${finding.title}`}
              onClick={() => onManage(finding)}>
              Cambiar
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" className="shrink-0"
            aria-label={`Ver evidencia de cumplimiento de ${finding.title}`}
            onClick={() => onView(finding)}>
            Ver
          </Button>
        </>
      ) : canEdit && (
        <Button type="button" variant="outline" size="sm" className="shrink-0"
          aria-label={`Adjuntar evidencia de cumplimiento a ${finding.title}`}
          onClick={() => onManage(finding)}>
          Adjuntar
        </Button>
      )}
    </div>
  )
}
