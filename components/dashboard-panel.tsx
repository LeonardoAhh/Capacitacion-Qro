import type { ReactNode } from "react"
import { AlertCircle, RotateCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CardHeader } from "@/components/ui/card"

export const CHART_TOOLTIP_CLASS =
  "min-w-48 ui-floating-surface bg-popover p-3 text-body-sm tabular-nums text-popover-foreground"

export interface PanelStat {
  /** Color de la serie en la gráfica (cuadro de la leyenda). */
  color: string
  label: string
  value: ReactNode
}

/** Cifras clave de la gráfica con el color de su serie. */
export function PanelStats({ items }: { items: PanelStat[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map(({ color, label, value }) => (
        <li key={label} className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
          <span className="size-2 shrink-0 rounded-sm" style={{ background: color }} aria-hidden="true" />
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
  return (
    <CardHeader className="flex flex-col gap-3 space-y-0 p-(--card-padding) pb-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        {description && <p className="text-body-sm text-muted-foreground">{description}</p>}
        {stats && stats.length > 0 && <PanelStats items={stats} />}
        {children}
      </div>
      {actions && <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">{actions}</div>}
    </CardHeader>
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
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-(--card-padding) py-12 text-center">
      {icon}
      <p className="text-body-md text-foreground">{title}</p>
      {hint && <p className="text-body-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}
