import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export interface SummaryItem {
  label: string
  value: number
  detail: string
  /** Color del valor (p. ej. "text-success"); por defecto, el del texto. */
  tone?: string
}

/** Resumen en una sola franja: 2 columnas en móvil y 4 desde lg. */
export function SummaryStrip({ items, loading = false }: { items: SummaryItem[]; loading?: boolean }) {
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-xl border bg-card lg:grid-cols-4">
      {items.map(({ label, value, detail, tone }, index) => (
        <div key={label} className={cn("min-w-0 space-y-1 p-(--card-padding)", index % 2 === 1 && "border-l", index >= 2 && "border-t lg:border-t-0", index === 2 && "lg:border-l")}>
          <dt className="text-body-sm text-muted-foreground">{label}</dt>
          <dd className={cn("text-heading-xl tabular-nums", tone ?? "text-foreground")}>{loading ? <Skeleton className="h-7 w-12" /> : value}</dd>
          <dd className="truncate text-body-sm text-muted-foreground">{loading ? <Skeleton className="h-4 w-20" /> : detail}</dd>
        </div>
      ))}
    </dl>
  )
}
