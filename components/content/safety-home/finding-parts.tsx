"use client"

import { useState } from "react"
import Image from "next/image"
import {
  CircleAlert, CircleCheck, Clock3, EllipsisVertical, Hourglass, ImageOff, Paperclip, Pencil, Trash2, type LucideIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { isoATexto } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import type { FindingPreview } from "./finding-constraints"
import { findingDueDate, isFindingOverdue, type FindingDeadline, type FindingStatus } from "./finding-constraints"

const STATUS_META: Record<FindingStatus, { icon: LucideIcon; className: string; solidClassName: string }> = {
  Abierto: {
    icon: CircleAlert,
    className: "border-destructive/20 bg-destructive/10 text-destructive",
    solidClassName: "border-border bg-card text-destructive",
  },
  "En seguimiento": {
    icon: Clock3,
    className: "border-warning/30 bg-warning/10 text-warning-deep",
    solidClassName: "border-border bg-card text-warning-deep",
  },
  Cerrado: {
    icon: CircleCheck,
    className: "border-success/20 bg-success/10 text-success",
    solidClassName: "border-border bg-card text-success",
  },
}

const DEADLINE_CLASS: Record<FindingDeadline, string> = {
  "Corrección Inmediata": "border-destructive/20 bg-destructive/10 text-destructive",
  "1 semana": "border-warning/30 bg-warning/10 text-warning-deep",
  "15 días": "border-urgency-low/30 bg-urgency-low/10 text-urgency-low",
}

const DEADLINE_SOLID_CLASS: Record<FindingDeadline, string> = {
  "Corrección Inmediata": "border-border bg-card text-destructive",
  "1 semana": "border-border bg-card text-warning-deep",
  "15 días": "border-border bg-card text-urgency-low",
}

const OVERDUE_CLASS = "border-destructive bg-destructive text-destructive-foreground"

const BADGE = "max-w-full gap-1 font-medium [&_svg]:size-3.5 [&_svg]:shrink-0"

/** Estatus y plazo del hallazgo. `nowrap`: en una línea, recortados si no caben (tablas). `surface="solid"`: fondo opaco legible sobre foto. */
export function FindingBadges({ finding, nowrap = false, surface = "tinted", className }: {
  finding: FindingPreview
  nowrap?: boolean
  surface?: "tinted" | "solid"
  className?: string
}) {
  const status = STATUS_META[finding.status]
  const StatusIcon = status.icon
  const overdue = isFindingOverdue(finding)
  const due = findingDueDate(finding)
  const dueText = due ? isoATexto(due) : ""
  const solid = surface === "solid"
  const badge = cn(BADGE, nowrap ? "whitespace-nowrap [&>span:last-child]:min-w-0 [&>span:last-child]:truncate" : "whitespace-normal")
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Badge variant="outline" size="sm" className={cn(badge, solid ? status.solidClassName : status.className)} title={finding.status}>
        <StatusIcon aria-hidden="true" /><span>{finding.status}</span>
      </Badge>
      {/* Vencido reemplaza al plazo: lo que importa es que ya se pasó, no cuánto tenía. */}
      {overdue ? (
        <Badge variant="outline" size="sm" className={cn(badge, OVERDUE_CLASS)} title={`Venció el ${dueText}`}>
          <Hourglass aria-hidden="true" /><span>Vencido<span className="sr-only"> el {dueText}</span></span>
        </Badge>
      ) : finding.deadline && (
        <Badge variant="outline" size="sm" className={cn(badge, solid ? DEADLINE_SOLID_CLASS[finding.deadline] : DEADLINE_CLASS[finding.deadline])}
          title={dueText && finding.status !== "Cerrado" ? `Plazo: ${finding.deadline} · vence el ${dueText}` : `Plazo: ${finding.deadline}`}>
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
  const [failed, setFailed] = useState(!src)

  if (failed) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-2 bg-muted p-4 text-center text-muted-foreground">
        <ImageOff className="size-5" aria-hidden="true" />
        <span className="text-body-sm">Imagen no disponible</span>
      </div>
    )
  }

  return (
    <>
      {!loaded && <Skeleton className="absolute inset-0 rounded-none" aria-hidden="true" />}
      <Image src={src} alt={alt} fill unoptimized sizes={sizes}
        onLoad={() => setLoaded(true)} onError={() => { setLoaded(true); setFailed(true) }}
        className={cn(
          "object-cover transition-[opacity,transform] duration-200 ease-out group-hover:scale-[1.02] group-focus-visible:scale-[1.02] motion-reduce:transform-none",
          loaded ? "opacity-100" : "opacity-0",
        )} />
    </>
  )
}

/** Dato con ícono: etiqueta pequeña y valor completo (sin cortar nombres largos). */
export function Dato({ icon: Icon, label, value, className }: { icon: LucideIcon; label: string; value: string; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
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
