"use client"

import React from "react"
import { CircleCheck, CircleX } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { BadgeProps } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { AptitudStatus } from "@/lib/promociones/types"
import { PROMOTION_ICON } from "@/lib/promociones/icon-styles"

// ─── Insignia de aptitud ───────────────────────────────────────────────────

const aptitudCfg: Record<AptitudStatus, { label: string; variant: NonNullable<BadgeProps['variant']> }> = {
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

// ─── Indicador de criterio individual ──────────────────────────────────────

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
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-1.5 text-body-md leading-relaxed text-muted-foreground">
        {cumple ? (
          <CircleCheck aria-hidden="true" className={`${PROMOTION_ICON.control} shrink-0 text-success`} />
        ) : (
          <CircleX aria-hidden="true" className={`${PROMOTION_ICON.control} shrink-0 text-destructive`} />
        )}
        <span>{label}</span>
      </div>
      <div className="text-right text-body-md leading-relaxed">
        <span className={`font-bold ${cumple ? "text-success" : "text-destructive"}`}>
          {valor}{unidad}
        </span>
        <span className="ml-1 text-body-md text-muted-foreground">/ mín {minimo}{unidad}</span>
      </div>
    </div>
  )
}

// ─── Tarjeta de resumen ────────────────────────────────────────────────────

export function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string
  value: number
  icon: React.ElementType
  color: string
  subtitle?: string
}) {
  return (
    <Card className="border">
      <CardContent className="flex items-center gap-4 p-(--card-padding)">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon aria-hidden="true" className={PROMOTION_ICON.feature} />
        </div>
        <div>
          <div className="text-heading-lg font-bold">{value}</div>
          <div className="text-body-md font-medium text-muted-foreground">{title}</div>
          {subtitle && <div className="text-body-sm text-muted-foreground mt-0.5">{subtitle}</div>}
        </div>
      </CardContent>
    </Card>
  )
}
