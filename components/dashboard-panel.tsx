import type { ReactNode } from "react"
import { CardHeader } from "@/components/ui/card"

export interface PanelStat {
  /** Color de la serie en la gráfica (punto de la leyenda). */
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
          <span className="size-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
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
        {description && <p className="text-body-md text-muted-foreground">{description}</p>}
        {stats && stats.length > 0 && <PanelStats items={stats} />}
        {children}
      </div>
      {actions && <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">{actions}</div>}
    </CardHeader>
  )
}
