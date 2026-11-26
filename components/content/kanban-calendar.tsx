"use client"

import { useMemo } from "react"
import { Flag } from "lucide-react"
import { cn } from "@/lib/utils"
import { COLOR_PRIORIDAD, useKanbanAcciones } from "@/components/content/kanban-meta"
import {
  etiquetaPrioridad, formatDiaSemana, ordenarTarjetas, sumarDias,
  type KanbanTarjeta,
} from "@/lib/kanban"

export const DIAS_SEMANA = 7

/**
 * Semana por fecha límite. En móvil los días se apilan; desde lg se ven en 7 columnas.
 * Las tarjetas sin fecha límite no aparecen aquí.
 */
export function KanbanCalendar({ tarjetas, inicio, hoy }: {
  tarjetas: KanbanTarjeta[]
  inicio: string
  hoy: string
}) {
  const { ver } = useKanbanAcciones()
  const dias = useMemo(() => Array.from({ length: DIAS_SEMANA }, (_, index) => sumarDias(inicio, index)), [inicio])
  const fin = dias[DIAS_SEMANA - 1]

  const porDia = useMemo(() => {
    const mapa = new Map<string, KanbanTarjeta[]>()
    for (const tarjeta of ordenarTarjetas(tarjetas)) {
      if (!tarjeta.fecha_limite || tarjeta.fecha_limite < inicio || tarjeta.fecha_limite > fin) continue
      mapa.set(tarjeta.fecha_limite, [...(mapa.get(tarjeta.fecha_limite) ?? []), tarjeta])
    }
    return mapa
  }, [tarjetas, inicio, fin])

  return (
    <section aria-labelledby="kanban-semana">
      <ol className="grid overflow-hidden rounded-xl border border-border bg-card max-lg:divide-y max-lg:divide-border lg:grid-cols-7 lg:divide-x lg:divide-border">
        {dias.map(dia => {
          const lista = porDia.get(dia) ?? []
          const esHoy = dia === hoy
          return (
            <li key={dia} aria-current={esHoy ? "date" : undefined}
              className="flex min-w-0 gap-3 p-3 max-lg:items-baseline lg:min-h-40 lg:flex-col lg:gap-2">
              <p className={cn("flex w-16 shrink-0 items-baseline gap-1.5 text-body-sm lg:w-auto",
                esHoy ? "font-medium text-primary" : "text-muted-foreground")}>
                <span className="capitalize">{formatDiaSemana(dia)}</span>
                <span className="tabular-nums">{Number(dia.slice(8))}</span>
              </p>
              {lista.length ? (
                <ul className="grid min-w-0 flex-1 gap-1.5 lg:flex-none">
                  {lista.map(tarjeta => (
                    <li key={tarjeta.id}>
                      <button type="button" onClick={() => ver(tarjeta)}
                        className={cn(
                          "flex w-full min-w-0 items-start gap-1.5 rounded-md border border-border px-2 py-2 text-left text-body-sm transition-colors hover:bg-muted max-lg:min-h-(--control-height) max-lg:items-center",
                          "",
                          tarjeta.estado === "concluido" ? "text-muted-foreground line-through" : "text-foreground",
                        )}>
                        <Flag className={cn("mt-0.5 size-3 shrink-0 fill-current max-lg:mt-0", COLOR_PRIORIDAD[tarjeta.prioridad])} aria-hidden="true" />
                        <span className="sr-only">Prioridad {etiquetaPrioridad(tarjeta.prioridad)}: </span>
                        <span className="line-clamp-2 min-w-0 break-words">{tarjeta.titulo}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body-sm text-muted-foreground lg:sr-only">Sin vencimientos</p>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
