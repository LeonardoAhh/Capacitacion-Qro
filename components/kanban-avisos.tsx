"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useRole, useUser } from "@/lib/hooks"
import { useKanbanAvisos } from "@/lib/hooks/useKanbanAvisos"
import { KanbanPushControl } from "@/components/kanban-push-control"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"
import { formatHace, hoyISO, PARAM_TARJETA, textoAviso } from "@/lib/kanban"

const ITEM = "flex w-full min-w-0 gap-3 rounded-sm px-2 py-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"

/**
 * Campana del encabezado: avisos del Kanban y tarjetas propias que vencen hoy o mañana.
 * Solo para quienes usan el tablero (los evaluadores no lo ven).
 */
export function KanbanAvisos() {
  const router = useRouter()
  const { user } = useUser()
  const { isEvaluador, loading } = useRole()
  const activo = Boolean(user) && !loading && !isEvaluador
  const [open, setOpen] = useState(false)
  const { avisos, porVencer, error, recargar, marcarLeidos } = useKanbanAvisos(user?.id ?? null, activo,
    aviso => notify.info(`${textoAviso(aviso)} «${aviso.titulo}»`))

  if (!activo) return null

  const sinLeer = avisos.filter(aviso => !aviso.leido)
  const pendientes = sinLeer.length + porVencer.length
  const hoy = hoyISO()

  function abrir(tarjetaId: string | null) {
    setOpen(false)
    if (tarjetaId) router.push(`/kanban?${PARAM_TARJETA}=${tarjetaId}`)
  }

  function marcar(ids: string[]) {
    marcarLeidos(ids).catch(cause => notify.error(cause instanceof Error ? cause.message : "No se pudieron marcar los avisos."))
  }

  return (
    <Popover open={open} onOpenChange={next => {
      setOpen(next)
      // Las fechas cambian con el día: al abrir se actualiza lo que vence.
      if (next) void recargar()
    }}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="relative shrink-0 text-muted-foreground"
          aria-label={pendientes ? `Avisos, ${pendientes} pendientes` : "Avisos"}>
          <Bell aria-hidden="true" />
          {pendientes > 0 && (
            <span aria-hidden="true"
              className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-eyebrow tabular-nums text-destructive-foreground">
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

        <div className="max-h-[min(28rem,70vh)] overflow-y-auto p-1">
          {error && <p role="alert" className="px-2 py-2 text-body-sm text-destructive">{error}</p>}

          {porVencer.length > 0 && (
            <section aria-labelledby="avisos-por-vencer" className="border-b border-border pb-1">
              <h3 id="avisos-por-vencer" className="px-2 pb-1 pt-2 text-eyebrow text-muted-foreground">Vencen pronto</h3>
              <ul>
                {porVencer.map(tarjeta => (
                  <li key={tarjeta.id}>
                    <button type="button" className={ITEM} onClick={() => abrir(tarjeta.id)}>
                      <CalendarDays className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                      <span className="grid min-w-0 gap-0.5">
                        <span className="line-clamp-1 text-body-md text-foreground">{tarjeta.titulo}</span>
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
            <ul aria-label="Avisos recientes">
              {avisos.map(aviso => (
                <li key={aviso.id}>
                  <button type="button" className={ITEM} onClick={() => {
                    if (!aviso.leido) marcar([aviso.id])
                    abrir(aviso.tarjeta_id)
                  }}>
                    <span aria-hidden="true"
                      className={cn("mt-2 size-1.5 shrink-0 rounded-full", aviso.leido ? "bg-transparent" : "bg-primary")} />
                    <span className="grid min-w-0 gap-0.5">
                      <span className={cn("text-body-sm", aviso.leido ? "text-muted-foreground" : "text-foreground")}>
                        {!aviso.leido && <span className="sr-only">Sin leer: </span>}{textoAviso(aviso)}
                      </span>
                      <span className="line-clamp-1 text-label-sm text-foreground">{aviso.titulo}</span>
                      <span className="text-body-sm text-muted-foreground">{formatHace(aviso.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : !porVencer.length && !error && (
            <p className="px-2 py-6 text-center text-body-sm text-muted-foreground">Sin avisos por ahora.</p>
          )}
        </div>
        <KanbanPushControl userId={user!.id} />
      </PopoverContent>
    </Popover>
  )
}
