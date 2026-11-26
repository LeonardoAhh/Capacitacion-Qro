"use client"

import { CircleCheck, CircleX } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { BadgeProps } from "@/components/ui/badge"
import type { AptitudStatus } from "@/lib/promociones/types"
import { PROMOTION_ICON } from "@/lib/promociones/icon-styles"

const aptitudCfg: Record<AptitudStatus, { label: string; variant: NonNullable<BadgeProps["variant"]> }> = {
  apto: { label: "Apto", variant: "success" },
  no_apto: { label: "No Apto", variant: "error" },
  pendiente: { label: "Espera", variant: "secondary" },
  pendiente_examen: { label: "Examen", variant: "warning" },
  en_revision: { label: "Revisión", variant: "info" },
  bloqueado_examen: { label: "Penalizado", variant: "destructive" },
}

export function AptitudBadge({ status }: { status: AptitudStatus }) {
  const cfg = aptitudCfg[status]
  return (
    <Badge variant={cfg.variant} size="sm" className="font-medium">{cfg.label}</Badge>
  )
}

export function CriterioRow({
  label,
  cumple,
  valor,
  minimo,
  unidad = "",
}: {
  label: string
  cumple: boolean
  valor: string | number
  minimo: string | number
  unidad?: string
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5">
      <div className="flex min-w-0 items-center gap-2 text-body-md text-foreground">
        {cumple ? (
          <CircleCheck aria-hidden="true" className={`${PROMOTION_ICON.control} shrink-0 text-success`} />
        ) : (
          <CircleX aria-hidden="true" className={`${PROMOTION_ICON.control} shrink-0 text-destructive`} />
        )}
        <span className="min-w-0 break-words">
          <span className="sr-only">{cumple ? "Cumple: " : "No cumple: "}</span>
          {label}
        </span>
      </div>
      <div className="shrink-0 text-right tabular-nums">
        <span className={`text-label-sm ${cumple ? "text-success" : "text-destructive"}`}>
          {valor}{unidad}
        </span>
        <span className="ml-1.5 text-body-sm text-muted-foreground">/ mín {minimo}{unidad}</span>
      </div>
    </div>
  )
}
