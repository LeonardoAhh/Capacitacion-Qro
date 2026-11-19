"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { useRole, useUser } from "@/lib/hooks"
import { useKanbanAvisos } from "@/lib/hooks/useKanbanAvisos"
import { usePendingEvals } from "@/lib/hooks/usePendingEvals"
import { KanbanPushControl } from "@/components/kanban-push-control"
import { EvaluationNoticeRows } from "@/components/evaluation-notice-rows"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"
import { formatHace, hoyISO, PARAM_TARJETA, textoAviso } from "@/lib/kanban"

const ITEM = "flex min-h-11 w-full min-w-0 items-center gap-2 px-3 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"

/**
 * Campana del encabezado: evaluaciones para evaluadores, Kanban para el resto.
 */
export function KanbanAvisos() {
  const router = useRouter()
  const { user } = useUser()
  const { isEvaluador, loading } = useRole()
  const activo = Boolean(user) && !loading
  const kanbanActivo = activo && !isEvaluador
  const evaluacionesActivas = activo && isEvaluador
  const [open, setOpen] = useState(false)
  const { avisos, porVencer, error, recargar, marcarLeidos } = useKanbanAvisos(user?.id ?? null, kanbanActivo,
    aviso => notify.info(`${textoAviso(aviso)}: «${aviso.titulo}»`))
  const { loading: evalLoading, totalVencidas, totalProximas, totalATiempo, cargar: recargarEvaluaciones } =
    usePendingEvals(undefined, evaluacionesActivas)

  if (!activo) return null

  const sinLeer = avisos.filter(aviso => !aviso.leido)
  const pendientes = sinLeer.length + porVencer.length + (evaluacionesActivas ? totalVencidas + totalProximas : 0)
  const hayEvaluaciones = evaluacionesActivas && totalVencidas + totalProximas + totalATiempo > 0
  const hoy = hoyISO()

  function abrir(tarjetaId: string | null) {
    setOpen(false)
    if (tarjetaId) router.push(`/kanban?${PARAM_TARJETA}=${tarjetaId}`)
  }

  function abrirRuta(href: string) {
    setOpen(false)
    router.push(href)
  }

  function marcar(ids: string[]) {
    marcarLeidos(ids).catch(cause => notify.error(cause instanceof Error ? cause.message : "No se pudieron marcar los avisos."))
  }

  return (
    <Popover open={open} onOpenChange={next => {
      setOpen(next)
      // Las fechas cambian con el día: al abrir se actualiza lo que vence.
      if (next) {
        if (kanbanActivo) void recargar()
        if (evaluacionesActivas) void recargarEvaluaciones()
      }
    }}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="relative shrink-0 text-muted-foreground"
          aria-label={pendientes ? `Avisos, ${pendientes} pendientes` : "Avisos"}>
          <Bell aria-hidden="true" />
          {pendientes > 0 && (
            <span aria-hidden="true"
              className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-sm bg-destructive px-1 text-eyebrow tabular-nums text-destructive-foreground">
              {pendientes > 9 ? "9+" : pendientes}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex min-h-11 items-center gap-2 border-b border-border pl-3 pr-1">
          <h2 className="text-label-sm text-foreground">Avisos</h2>
          {sinLeer.length > 0 && (
            <Button type="button" variant="ghost" size="xs" className="ml-auto text-muted-foreground"
              onClick={() => marcar(sinLeer.map(aviso => aviso.id))}>
              Marcar como leídos
            </Button>
          )}
        </div>

        <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
          {error && <p role="alert" className="px-3 py-2 text-body-sm text-destructive">{error}</p>}

          {evaluacionesActivas && evalLoading && !hayEvaluaciones && (
            <div role="status" aria-label="Cargando avisos de evaluaciones" className="grid gap-2 px-3 py-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          )}

          {evaluacionesActivas && (
            <EvaluationNoticeRows vencidas={totalVencidas} proximas={totalProximas}
              aTiempo={totalATiempo} onOpen={abrirRuta} />
          )}

          {porVencer.length > 0 && (
            <section aria-label="Vencen pronto" className={hayEvaluaciones ? "border-t border-border" : undefined}>
              <ul className="divide-y divide-border">
                {porVencer.map(tarjeta => (
                  <li key={tarjeta.id}>
                    <button type="button" className={ITEM} onClick={() => abrir(tarjeta.id)}>
                      <CalendarDays className="size-4 shrink-0 text-warning" aria-hidden="true" />
                      <span className="grid min-w-0 flex-1" title={tarjeta.titulo}>
                        <span className="truncate text-label-sm text-foreground">{tarjeta.titulo}</span>
                        <span className="text-body-sm text-muted-foreground">
                          {tarjeta.fecha_limite === hoy ? "Vence hoy" : "Vence mañana"}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {avisos.length ? (
            <ul aria-label="Avisos recientes" className={cn("divide-y divide-border", (porVencer.length > 0 || hayEvaluaciones) && "border-t border-border")}>
              {avisos.map(aviso => (
                <li key={aviso.id}>
                  <button type="button" className={ITEM} onClick={() => {
                    if (!aviso.leido) marcar([aviso.id])
                    abrir(aviso.tarjeta_id)
                  }}>
                    <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center">
                      <span className={cn("size-1.5 rounded-sm", aviso.leido ? "bg-transparent" : "bg-primary")} />
                    </span>
                    <span className="grid min-w-0 flex-1">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className={cn("min-w-0 flex-1 truncate text-label-sm", aviso.leido ? "text-muted-foreground" : "text-foreground")} title={aviso.titulo}>
                          {!aviso.leido && <span className="sr-only">Sin leer: </span>}{aviso.titulo}
                        </span>
                        <span className="shrink-0 text-body-sm text-muted-foreground">{formatHace(aviso.created_at)}</span>
                      </span>
                      <span className="truncate text-body-sm text-muted-foreground" title={textoAviso(aviso)}>{textoAviso(aviso)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : !porVencer.length && !hayEvaluaciones && !error && !(evaluacionesActivas && evalLoading) && (
            <p className="px-3 py-3 text-body-sm text-muted-foreground">Sin avisos por ahora.</p>
          )}
        </div>
        <KanbanPushControl userId={user!.id} />
      </PopoverContent>
    </Popover>
  )
}
