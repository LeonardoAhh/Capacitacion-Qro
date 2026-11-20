"use client"

import { CircleAlert, Clock3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { DESEMPENO } from "@/lib/desempeno/presentation"

const ITEM = "flex min-h-11 w-full items-center gap-2 px-3 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"

/**
 * Resumen de evaluaciones en una sola fila: vencidas (en rojo) y próximas.
 * Las que van a tiempo no piden acción y no se muestran.
 */
export function EvaluationNoticeRows({ vencidas, proximas, onOpen }: {
  vencidas: number
  proximas: number
  onOpen: (href: string) => void
}) {
  if (!vencidas && !proximas) return null
  const Icon = vencidas ? CircleAlert : Clock3
  const partes = [
    vencidas > 0 && `${vencidas} ${vencidas === 1 ? "vencida" : "vencidas"}`,
    proximas > 0 && `${proximas} ${proximas === 1 ? "próxima" : "próximas"}`,
  ].filter(Boolean)

  return (
    <button type="button" className={ITEM} onClick={() => onOpen(DESEMPENO.routes.pending)}
      aria-label={`Evaluaciones: ${partes.join(", ")}. Ver detalle`}>
      <Icon className={cn("size-4 shrink-0", vencidas ? "text-destructive" : "text-warning")} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-label-sm tabular-nums text-foreground">
        {vencidas > 0 && <span className="text-destructive">{partes[0]}</span>}
        {vencidas > 0 && proximas > 0 && <span className="text-muted-foreground"> · </span>}
        {proximas > 0 && <span>{partes[partes.length - 1]}</span>}
      </span>
    </button>
  )
}
