"use client"

import { CircleAlert, CircleCheck, Clock3 } from "lucide-react"
import { DESEMPENO } from "@/lib/desempeno/presentation"

const ITEM = "flex min-h-11 w-full items-center gap-2 px-3 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"

export function EvaluationNoticeRows({ vencidas, proximas, aTiempo, onOpen }: {
  vencidas: number
  proximas: number
  aTiempo: number
  onOpen: (href: string) => void
}) {
  const rows = [
    { key: "vencidas", count: vencidas, title: "Evaluaciones vencidas", Icon: CircleAlert, color: "text-destructive" },
    { key: "proximas", count: proximas, title: "Evaluaciones próximas", Icon: Clock3, color: "text-warning" },
    { key: "a-tiempo", count: aTiempo, title: "Evaluaciones a tiempo", Icon: CircleCheck, color: "text-success" },
  ] as const
  const visible = rows.filter(row => row.count > 0)
  if (!visible.length) return null

  return (
    <section aria-label="Evaluaciones de desempeño">
      <ul className="divide-y divide-border">
        {visible.map(({ key, count, title, Icon, color }) => (
          <li key={key}>
            <button type="button" className={ITEM} onClick={() => onOpen(DESEMPENO.routes.pending)}
              aria-label={`${title}: ${count} pendientes. Ver detalle`}>
              <Icon className={`size-4 shrink-0 ${color}`} aria-hidden="true" />
              <span className="grid min-w-0 flex-1">
                <span className="truncate text-label-sm text-foreground">{title}</span>
                <span className="text-body-sm text-muted-foreground tabular-nums">{count} {count === 1 ? "pendiente" : "pendientes"}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
