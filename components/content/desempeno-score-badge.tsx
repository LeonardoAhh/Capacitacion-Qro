import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { UMBRAL_CALIFICACION_APROBATORIA } from "@/lib/types/desempeno"

interface ScoreBadgeProps {
  score: number | null | undefined
  className?: string
}

export function ScoreBadge({ score, className = "" }: ScoreBadgeProps) {
  if (score == null) return null

  const pct = Math.min(100, Math.max(0, score))
  const color =
    pct < 60 ? "bg-destructive/15 text-destructive border-destructive/30" :
    pct < UMBRAL_CALIFICACION_APROBATORIA ? "bg-warning/15 text-warning border-warning/30" :
    "bg-success/15 text-success border-success/30"

  return (
    <Badge
      variant="outline"
      aria-label={`Calificación final: ${pct} de 100`}
      className={cn("shrink-0 px-2 text-label-sm tabular-nums", color, className)}
    >
      {pct.toFixed(0)}%
    </Badge>
  )
}
