"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { KanbanAvatar } from "@/components/content/kanban-meta"
import {
  cargaDelEquipo, DIAS_INDICADORES, indicadoresEquipo, LIMITE_EN_PROGRESO,
  type KanbanMiembro, type KanbanTarjeta,
} from "@/lib/kanban"

interface KanbanTeamProps {
  tarjetas: KanbanTarjeta[]
  miembros: KanbanMiembro[]
}

function Indicador({ label, valor, detalle }: { label: string; valor: string; detalle: string }) {
  return (
    <div className="grid min-w-0 gap-1 p-3 sm:p-4">
      <dt className="text-body-sm text-muted-foreground">{label}</dt>
      <dd className="text-heading-md tabular-nums text-foreground">{valor}</dd>
      <dd className="text-body-sm text-muted-foreground">{detalle}</dd>
    </div>
  )
}

/** Carga por persona y desempeño del equipo, sin gráficas: números directos y comparables. */
export function KanbanTeam({ tarjetas, miembros }: KanbanTeamProps) {
  const carga = useMemo(() => cargaDelEquipo(tarjetas, miembros), [tarjetas, miembros])
  const indicadores = useMemo(() => indicadoresEquipo(tarjetas), [tarjetas])
  const porcentaje = indicadores.conFecha ? Math.round((indicadores.aTiempo / indicadores.conFecha) * 100) : null
  const dias = indicadores.diasPromedio === null ? null : Math.round(indicadores.diasPromedio * 10) / 10

  return (
    <div className="grid gap-4">
      <section aria-labelledby="kanban-indicadores" className="grid gap-2">
        <h2 id="kanban-indicadores" className="text-label-sm text-foreground">
          Indicadores <span className="font-normal text-muted-foreground">· últimos {DIAS_INDICADORES} días</span>
        </h2>
        <dl className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card">
          <Indicador label="Concluidas" valor={String(indicadores.concluidas)} detalle="tarjetas" />
          <Indicador label="A tiempo" valor={porcentaje === null ? "—" : `${porcentaje}%`}
            detalle={indicadores.conFecha ? `${indicadores.aTiempo} de ${indicadores.conFecha} con fecha` : "sin fechas límite"} />
          <Indicador label="Tiempo promedio" valor={dias === null ? "—" : String(dias)} detalle={dias === 1 ? "día por tarjeta" : "días por tarjeta"} />
        </dl>
      </section>

      <section aria-labelledby="kanban-carga" className="grid gap-2">
        <h2 id="kanban-carga" className="text-label-sm text-foreground">
          Carga del equipo <span className="font-normal text-muted-foreground">· en progreso máximo {LIMITE_EN_PROGRESO} por persona</span>
        </h2>
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {carga.map(({ miembro, activas, enProgreso, vencidas, bloqueadas }) => {
            const excedido = enProgreso > LIMITE_EN_PROGRESO
            return (
              <li key={miembro.user_id} className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                <span className="flex min-w-0 flex-1 basis-48 items-center gap-2">
                  <KanbanAvatar miembro={miembro} rol="Integrante" />
                  <span aria-hidden="true" className="truncate text-body-md text-foreground">{miembro.nombre}</span>
                </span>
                <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted-foreground max-sm:pl-8">
                  <div className="flex gap-1"><dt>Activas</dt><dd className="tabular-nums text-foreground">{activas}</dd></div>
                  <div className={cn("flex gap-1", excedido && "font-medium text-warning")}>
                    <dt>En progreso</dt>
                    <dd className={cn("tabular-nums", !excedido && "text-foreground")}>{enProgreso}/{LIMITE_EN_PROGRESO}</dd>
                  </div>
                  {vencidas > 0 && (
                    <div className="flex gap-1 font-medium text-destructive"><dt>Vencidas</dt><dd className="tabular-nums">{vencidas}</dd></div>
                  )}
                  {bloqueadas > 0 && (
                    <div className="flex gap-1 text-warning"><dt>Bloqueadas</dt><dd className="tabular-nums">{bloqueadas}</dd></div>
                  )}
                </dl>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
