"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Flag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { COLOR_PRIORIDAD, useKanbanAcciones } from "@/components/content/kanban-meta"
import {
  etiquetaPrioridad, formatDiaSemana, formatFechaCorta, hoyISO, inicioSemana, ordenarTarjetas, sumarDias,
  type KanbanTarjeta,
} from "@/lib/kanban"

const DIAS_SEMANA = 7

/**
 * Semana por fecha límite. En móvil los días se apilan; desde lg se ven en 7 columnas.
 * Las tarjetas sin fecha límite no aparecen aquí.
 */
export function KanbanCalendar({ tarjetas }: { tarjetas: KanbanTarjeta[] }) {
  const { editar } = useKanbanAcciones()
  const hoy = hoyISO()
  const [inicio, setInicio] = useState(() => inicioSemana(hoy))
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
  const total = [...porDia.values()].reduce((sum, list) => sum + list.length, 0)

  return (
    <section aria-labelledby="kanban-semana" className="grid gap-3">
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" aria-label="Semana anterior" onClick={() => setInicio(sumarDias(inicio, -DIAS_SEMANA))}>
          <ChevronLeft aria-hidden="true" />
        </Button>
        <h2 id="kanban-semana" className="text-label-sm tabular-nums text-foreground">
          {formatFechaCorta(inicio)} – {formatFechaCorta(fin)}
          <span className="sr-only">, {total} {total === 1 ? "vencimiento" : "vencimientos"}</span>
        </h2>
        <Button type="button" variant="ghost" size="icon" aria-label="Semana siguiente" onClick={() => setInicio(sumarDias(inicio, DIAS_SEMANA))}>
          <ChevronRight aria-hidden="true" />
        </Button>
        {inicio !== inicioSemana(hoy) && (
          <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => setInicio(inicioSemana(hoy))}>Hoy</Button>
        )}
      </div>

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
                      <button type="button" onClick={() => editar(tarjeta)}
                        className={cn(
                          "flex w-full min-w-0 items-start gap-1.5 rounded-md border border-border px-2 py-1.5 text-left text-body-sm hover:bg-muted",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                          tarjeta.estado === "concluido" ? "text-muted-foreground line-through" : "text-foreground",
                        )}>
                        <Flag className={cn("mt-0.5 size-3 shrink-0 fill-current", COLOR_PRIORIDAD[tarjeta.prioridad])} aria-hidden="true" />
                        <span className="sr-only">Prioridad {etiquetaPrioridad(tarjeta.prioridad)}: </span>
                        <span className="line-clamp-2 min-w-0 break-words">{tarjeta.titulo}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body-sm text-muted-foreground/60"><span aria-hidden="true">—</span><span className="sr-only">Sin vencimientos</span></p>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
