"use client"

import { useState, type ReactNode } from "react"
import { AlertCircle, ChevronLeft, ChevronRight, Maximize2, Minimize2, RotateCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { ALL_DEPARTMENTS } from "@/lib/constants/filters"
import { cn } from "@/lib/utils"

export const CHART_TOOLTIP_CLASS =
  "min-w-48 ui-floating-surface bg-popover p-3 text-body-sm tabular-nums text-popover-foreground"

/** Puntos de las gráficas de líneas: rellenos; huecos en series secundarias (punteadas). */
export const chartDot = (color: string, outline = false) => outline
  ? { r: 4, fill: "hsl(var(--card))", stroke: color, strokeWidth: 2 }
  : { r: 4, fill: color, strokeWidth: 0 }

export const chartActiveDot = (color: string) => ({ r: 6, fill: color, strokeWidth: 2, stroke: "hsl(var(--card))" })

interface ChartPointProps { cx?: number; cy?: number; index?: number; payload?: unknown }

/** Punto con color propio por dato (p. ej. cumple / bajo meta); `active` es el del cursor. */
export function chartPointDot<T>(colorOf: (payload: T) => string, active = false) {
  return function ChartPoint({ cx, cy, index, payload }: ChartPointProps) {
    if (cx == null || cy == null || payload == null) return <g key={`point-${index}`} />
    const color = colorOf(payload as T)
    return active
      ? <circle key={`point-${index}`} cx={cx} cy={cy} r={6} fill={color} stroke="hsl(var(--card))" strokeWidth={2} />
      : <circle key={`point-${index}`} cx={cx} cy={cy} r={4} fill={color} />
  }
}

/** Guía vertical del tooltip en gráficas de líneas. */
export const CHART_LINE_CURSOR = { stroke: "hsl(var(--border))" }

export interface PanelStat {
  /** Color de la serie en la gráfica (cuadro de la leyenda); sin él, la cifra va sola. */
  color?: string
  label: string
  value: ReactNode
}

/** Cifras clave, con el color de su serie cuando acompañan una gráfica. */
export function PanelStats({ items }: { items: PanelStat[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map(({ color, label, value }) => (
        <li key={label} className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
          {color && <span className="size-2 shrink-0 rounded-sm" style={{ background: color }} aria-hidden="true" />}
          {label}
          <span className="text-label-sm tabular-nums text-foreground">{value}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Encabezado de un panel de Inicio. Sin título: lo da la barra lateral interna.
 * A la izquierda la descripción, las cifras y controles propios (p. ej. pestañas);
 * a la derecha las acciones o filtros.
 */
export function PanelHeader({ description, stats, actions, children }: {
  description?: ReactNode
  stats?: PanelStat[]
  actions?: ReactNode
  children?: ReactNode
}) {
  // Sin descripción ni cifras, controles y acciones quedan en una sola línea centrada.
  const singleLine = !description && !stats?.length
  return (
    <CardHeader className={cn("flex flex-col gap-3 space-y-0 p-(--card-padding) pb-3 sm:flex-row sm:justify-between", singleLine ? "sm:items-center" : "sm:items-start")}>
      <div className="min-w-0 flex-1 space-y-2">
        {description && <p className="text-body-sm text-muted-foreground">{description}</p>}
        {stats && stats.length > 0 && <PanelStats items={stats} />}
        {children}
      </div>
      {actions && <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">{actions}</div>}
    </CardHeader>
  )
}

/**
 * Navegación ‹ valor › para los encabezados de panel (semana, departamento).
 * Sin `onPrevious` / `onNext`, la flecha correspondiente queda deshabilitada.
 */
export function PanelPager({ label, children, previousLabel, nextLabel, onPrevious, onNext, className }: {
  /** Nombre accesible de la navegación (p. ej. "Departamento"). */
  label: string
  children: ReactNode
  previousLabel: string
  nextLabel: string
  onPrevious?: () => void
  onNext?: () => void
  className?: string
}) {
  return (
    <nav aria-label={label} className="flex w-full items-center justify-between gap-1 sm:w-auto">
      <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label={previousLabel} disabled={!onPrevious} onClick={onPrevious}>
        <ChevronLeft aria-hidden="true" />
      </Button>
      <span aria-live="polite" className={cn("truncate text-center text-label-sm tabular-nums text-foreground", className)}>{children}</span>
      <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label={nextLabel} disabled={!onNext} onClick={onNext}>
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  )
}

/**
 * Recorre los departamentos con ‹ ›. La primera opción es "Departamentos" (sin filtro),
 * como el resto de filtros de la app; `getValue` decide si el valor es el id o el nombre.
 */
export function DepartmentPager<T extends { id: string; name: string }>({ departments, value, onChange, getValue }: {
  departments: T[]
  value: string
  onChange: (value: string) => void
  getValue?: (department: T) => string
}) {
  const options = [
    { value: ALL_DEPARTMENTS, name: "Departamentos" },
    ...departments.map(department => ({ value: getValue ? getValue(department) : department.id, name: department.name })),
  ]
  const index = Math.max(0, options.findIndex(option => option.value === value))
  const previous = options[index - 1]
  const next = options[index + 1]
  return (
    <PanelPager
      label="Departamento"
      previousLabel={previous ? `Anterior: ${previous.name}` : "Sin departamento anterior"}
      nextLabel={next ? `Siguiente: ${next.name}` : "Sin departamento siguiente"}
      onPrevious={previous ? () => onChange(previous.value) : undefined}
      onNext={next ? () => onChange(next.value) : undefined}
      className="w-40"
    >
      {options[index].name}
    </PanelPager>
  )
}

export function PanelError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="grid gap-3 bg-destructive/10 p-4 [&>svg]:left-4 [&>svg]:top-4">
      <AlertCircle className="size-4" aria-hidden="true" />
      <AlertDescription className="text-body-md">{message}</AlertDescription>
      <div>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden="true" />Reintentar
        </Button>
      </div>
    </Alert>
  )
}

export function PanelEmpty({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-(--card-padding) py-10 text-center">
      {icon}
      <p className="text-body-md text-foreground">{title}</p>
      {hint && <p className="text-body-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}

export interface PanelLegendItem {
  label: string
  color: string
  /** Serie secundaria (línea punteada o tendencia): cuadro solo con borde. */
  outline?: boolean
}

/** Leyenda de gráfica: cuadro de color y nombre, centrada bajo la gráfica. */
export function PanelLegend({ items, className }: { items: readonly PanelLegendItem[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap justify-center gap-x-4 gap-y-1 text-body-sm text-foreground", className)}>
      {items.map(({ label, color, outline }) => (
        <li key={label} className="flex items-center gap-1.5">
          <span
            className="size-2.5 shrink-0 rounded-sm border-2"
            style={{ borderColor: color, background: outline ? "transparent" : color }}
            aria-hidden="true"
          />
          {label}
        </li>
      ))}
    </ul>
  )
}

/** Clases del cuerpo de un panel: ampliado, ocupa el alto restante y hace scroll si no cabe. */
export const panelBodyClass = (expanded: boolean) =>
  cn("p-(--card-padding) pt-0", expanded && "flex min-h-0 flex-1 flex-col overflow-y-auto")

/** Alto de una gráfica: fijo en la tarjeta, todo el espacio libre al ampliar. */
export const panelChartClass = (expanded: boolean, height: string) =>
  expanded ? "min-h-64 flex-1" : height

export interface ExpandablePanelContext {
  expanded: boolean
  /** Botón de ampliar / reducir para las acciones del encabezado. */
  expandButton: ReactNode
}

/**
 * Tarjeta de Inicio que se puede ampliar a pantalla completa. El contenido se pinta
 * igual en la tarjeta y en el diálogo; el estado del panel (filtros, pestañas) es el mismo.
 */
export function ExpandablePanel({ label, testId, children }: {
  /** Nombre del panel para el diálogo y el botón (p. ej. "Retardos"). */
  label: string
  testId?: string
  children: (context: ExpandablePanelContext) => ReactNode
}) {
  const [expanded, setExpanded] = useState(false)
  const button = (isExpanded: boolean) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="shrink-0"
      aria-label={isExpanded ? `Reducir ${label}` : `Ampliar ${label} a pantalla completa`}
      onClick={() => setExpanded(!isExpanded)}
    >
      {isExpanded ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
    </Button>
  )

  return (
    <>
      <Card data-testid={testId}>{children({ expanded: false, expandButton: button(false) })}</Card>
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent
          raw
          className="inset-0 top-0 h-dvh max-h-none rounded-none bg-card safe-top safe-bottom sm:inset-0 sm:left-0 sm:top-0 sm:h-dvh sm:w-full sm:max-w-none sm:max-h-none sm:translate-x-0 sm:translate-y-0 sm:rounded-none"
        >
          <DialogTitle className="sr-only">{label}</DialogTitle>
          <DialogDescription className="sr-only">Vista ampliada de {label}.</DialogDescription>
          {expanded && children({ expanded: true, expandButton: button(true) })}
        </DialogContent>
      </Dialog>
    </>
  )
}
