"use client"

import { useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Bell, BellOff, CalendarDays, Loader2, RotateCw, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { useRole, useUser } from "@/lib/hooks"
import { useKanbanAvisos } from "@/lib/hooks/useKanbanAvisos"
import { usePendingEvals } from "@/lib/hooks/usePendingEvals"
import { useKanbanPush } from "@/lib/hooks/useKanbanPush"
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/useMediaQuery"
import { KanbanPushControl } from "@/components/kanban-push-control"
import { EvaluationNoticeRows } from "@/components/evaluation-notice-rows"
import { notify } from "@/lib/notify"
import { confirmUnsavedChanges, hasUnsavedChanges } from "@/lib/unsaved-changes"
import { cn } from "@/lib/utils"
import { formatHace, hoyISO, PARAM_TARJETA, textoAviso } from "@/lib/kanban"
import { DESEMPENO } from "@/lib/desempeno/presentation"
import { TRAINING_WORKSPACE_PATH } from "@/lib/workspace-paths"

const SECCION = "px-3 pb-1 pt-3 text-eyebrow text-muted-foreground"
const ITEM = "flex min-h-(--menu-item-height) w-full min-w-0 items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
const DESCRIPCION = "Evaluaciones, tarjetas por vencer y avisos del Kanban"

/**
 * Campana del encabezado. En celular abre un popover; en tablet y escritorio,
 * un panel lateral que aprovecha el alto de la pantalla.
 * Evaluaciones: evaluadores ven las suyas (RLS); quienes supervisan, las de toda la empresa.
 * Cada sección solo aparece si el rol puede abrir su pantalla; sin ninguna, no hay campana.
 */
export function KanbanAvisos() {
  const router = useRouter()
  const { user } = useUser()
  const { canAccess, isEvaluador, loading } = useRole()
  const lateral = useMediaQuery(DESKTOP_QUERY)
  const conSesion = Boolean(user) && !loading
  // Cada sección aparece solo si el rol puede abrir su pantalla (lib/constants/roles).
  const kanbanActivo = conSesion && canAccess(TRAINING_WORKSPACE_PATH)
  const evaluacionesActivas = conSesion && canAccess(DESEMPENO.routes.pending)
  const activo = kanbanActivo || evaluacionesActivas
  const [open, setOpen] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [retrying, setRetrying] = useState(false)
  // Al abrir, el foco va al panel y no a la primera fila (evita que aparezca marcada).
  const panelRef = useRef<HTMLDivElement>(null)
  const enfocarPanel = (event: Event) => {
    event.preventDefault()
    panelRef.current?.focus()
  }
  // Se sincroniza al cargar: quien ya dio permiso no vuelve a activarlas.
  const push = useKanbanPush(user?.id ?? null, activo)
  // Con push activo el sistema ya muestra la notificación; el toast sería un duplicado.
  const { avisos, porVencer, loading: kanbanLoading, error: kanbanError, recargar, marcarLeidos } =
    useKanbanAvisos(user?.id ?? null, kanbanActivo,
      aviso => { if (push.state !== "active") notify.info(`${textoAviso(aviso)}: «${aviso.titulo}»`) })
  const { loading: evalLoading, error: evalError, totalVencidas, totalProximas, cargar: recargarEvaluaciones } =
    usePendingEvals(undefined, evaluacionesActivas, { silent: true })

  if (!activo) return null

  const sinLeer = avisos.filter(aviso => !aviso.leido)
  // El contador solo suma lo que pide acción ahora; las próximas se ven al abrir.
  const pendientes = sinLeer.length + porVencer.length + totalVencidas
  const hayEvaluaciones = totalVencidas + totalProximas > 0
  const hayKanban = porVencer.length > 0 || avisos.length > 0
  const cargandoKanban = kanbanActivo && kanbanLoading && !hayKanban
  const cargandoEvaluaciones = evaluacionesActivas && evalLoading && !hayEvaluaciones
  const errores = [kanbanActivo ? kanbanError : null, evaluacionesActivas ? evalError : null]
    .filter((mensaje): mensaje is string => Boolean(mensaje))
  const errorMensaje = errores.length > 0 ? [...new Set(errores)].join(" ") : null
  const desactivandoPush = push.state === "deactivating"
  const hoy = hoyISO()

  function cambiarAbierto(next: boolean) {
    setOpen(next)
    // Las fechas cambian con el día: al abrir se actualiza lo que vence.
    if (next) {
      if (kanbanActivo) void recargar()
      if (evaluacionesActivas) void recargarEvaluaciones()
    }
  }

  function abrirRuta(href: string, alConfirmar?: () => void) {
    setOpen(false)
    if (hasUnsavedChanges()) {
      void confirmUnsavedChanges().then(confirmed => {
        if (!confirmed) return
        alConfirmar?.()
        router.push(href)
      })
      return
    }
    alConfirmar?.()
    router.push(href)
  }

  function configurarPush(accion: () => Promise<void>, exito: string) {
    accion()
      .then(() => notify.success(exito))
      .catch(cause => notify.error(cause instanceof Error ? cause.message : "No se pudieron configurar las notificaciones."))
  }

  function marcar(ids: string[], bloquearTodo = false) {
    if (bloquearTodo) setMarkingAll(true)
    marcarLeidos(ids)
      .catch(cause => notify.error(cause instanceof Error ? cause.message : "No se pudieron marcar los avisos."))
      .finally(() => { if (bloquearTodo) setMarkingAll(false) })
  }

  function reintentar() {
    if (retrying) return
    setRetrying(true)
    const tareas: Promise<unknown>[] = []
    if (kanbanActivo) tareas.push(recargar())
    if (evaluacionesActivas) tareas.push(recargarEvaluaciones())
    void Promise.allSettled(tareas).finally(() => setRetrying(false))
  }

  const campana = (props?: { onClick?: () => void; expanded?: boolean }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="relative shrink-0 text-muted-foreground"
      onClick={props?.onClick}
      aria-haspopup={props?.expanded !== undefined ? "dialog" : undefined}
      aria-expanded={props?.expanded}
      aria-label={pendientes ? `Avisos, ${pendientes} pendientes` : "Avisos"}
    >
      <Bell aria-hidden="true" />
      {pendientes > 0 && (
        <span aria-hidden="true"
          className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-sm bg-destructive px-1 text-eyebrow tabular-nums text-destructive-foreground">
          {pendientes > 9 ? "9+" : pendientes}
        </span>
      )}
    </Button>
  )

  const acciones = (
    <div className="ml-auto flex items-center gap-1">
      {sinLeer.length > 0 && (
        <Button type="button" variant="ghost" size="xs" className="text-muted-foreground"
          disabled={markingAll} aria-busy={markingAll || undefined}
          onClick={() => marcar(sinLeer.map(aviso => aviso.id), true)}>
          {markingAll ? "Marcando…" : "Marcar como leídos"}
        </Button>
      )}
      {(push.state === "active" || desactivandoPush) && (
        <Button type="button" variant="ghost" size="xs" className="px-1 text-muted-foreground"
          disabled={desactivandoPush} aria-busy={desactivandoPush || undefined}
          aria-label={desactivandoPush ? "Desactivando notificaciones en este dispositivo" : "Desactivar notificaciones en este dispositivo"}
          title="Desactivar notificaciones en este dispositivo"
          onClick={() => configurarPush(push.desactivar, "Notificaciones desactivadas en este dispositivo")}>
          {desactivandoPush
            ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            : <BellOff aria-hidden="true" />}
        </Button>
      )}
    </div>
  )

  const lista: ReactNode = (
    <>
      {errorMensaje && (
        <div className="p-3">
          <Alert variant="destructive" className="grid gap-2 bg-destructive/10 p-3 [&>svg]:left-3 [&>svg]:top-3">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertDescription className="text-body-sm">{errorMensaje}</AlertDescription>
            <div>
              <Button type="button" variant="outline" size="xs" disabled={retrying}
                aria-busy={retrying || undefined} onClick={reintentar}>
                <RotateCw className={cn(retrying && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
                {retrying ? "Reintentando…" : "Reintentar"}
              </Button>
            </div>
          </Alert>
        </div>
      )}

      {(hayEvaluaciones || cargandoEvaluaciones) && (
        <section aria-labelledby="avisos-evaluaciones" className="pb-1">
          <h3 id="avisos-evaluaciones" className={SECCION}>Evaluaciones</h3>
          {hayEvaluaciones ? (
            <EvaluationNoticeRows vencidas={totalVencidas} proximas={totalProximas} onOpen={abrirRuta} />
          ) : (
            <div role="status" aria-label="Cargando evaluaciones" className="px-3 py-3">
              <span className="sr-only">Cargando evaluaciones…</span>
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}
        </section>
      )}

      {(hayKanban || cargandoKanban) && (
        <section aria-labelledby="avisos-kanban" className={cn("pb-1", (hayEvaluaciones || cargandoEvaluaciones) && "border-t border-border")}>
          <h3 id="avisos-kanban" className={SECCION}>Kanban</h3>
          {hayKanban ? (
            <ul className="divide-y divide-border">
              {porVencer.map(tarjeta => (
                <li key={tarjeta.id}>
                  <button type="button" className={ITEM} onClick={() => abrirRuta(`/kanban?${PARAM_TARJETA}=${tarjeta.id}`)}>
                    <CalendarDays className="size-4 shrink-0 text-warning-deep" aria-hidden="true" />
                    <span className="grid min-w-0 flex-1" title={tarjeta.titulo}>
                      <span className="truncate text-label-sm text-foreground">{tarjeta.titulo}</span>
                      <span className="text-body-sm text-muted-foreground">
                        {tarjeta.fecha_limite === hoy ? "Vence hoy" : "Vence mañana"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {avisos.map(aviso => (
                <li key={aviso.id}>
                  <button type="button" className={ITEM} onClick={() => {
                    abrirRuta(
                      aviso.tarjeta_id ? `/kanban?${PARAM_TARJETA}=${aviso.tarjeta_id}` : "/kanban",
                      () => { if (!aviso.leido) marcar([aviso.id]) },
                    )
                  }}>
                    <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center">
                      <span className={cn("size-1.5 rounded-sm", aviso.leido ? "bg-transparent" : "bg-primary")} />
                    </span>
                    <span className="grid min-w-0 flex-1">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className={cn("min-w-0 flex-1 truncate text-label-sm", aviso.leido ? "text-muted-foreground" : "text-foreground")} title={aviso.titulo}>
                          {!aviso.leido && <span className="sr-only">Sin leer: </span>}{aviso.titulo}
                        </span>
                        <time dateTime={aviso.created_at} className="shrink-0 text-body-sm tabular-nums text-muted-foreground">
                          {formatHace(aviso.created_at)}
                        </time>
                      </span>
                      <span className="truncate text-body-sm text-muted-foreground" title={textoAviso(aviso)}>{textoAviso(aviso)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div role="status" aria-label="Cargando avisos de Kanban" className="grid gap-3 px-3 py-3">
              <span className="sr-only">Cargando avisos de Kanban…</span>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
          )}
        </section>
      )}

      {!hayKanban && !hayEvaluaciones && !errorMensaje && !cargandoKanban && !cargandoEvaluaciones && (
        <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
          <Bell className="size-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-body-sm text-muted-foreground">Sin avisos por ahora.</p>
        </div>
      )}
    </>
  )

  const pie = (
    <KanbanPushControl state={push.state}
      onActivate={() => configurarPush(push.activar, "Notificaciones activadas en este dispositivo")} />
  )

  const cerrar = (
    <Button type="button" variant="ghost" size="xs" className="px-1 text-muted-foreground"
      aria-label="Cerrar avisos" onClick={() => cambiarAbierto(false)}>
      <X aria-hidden="true" />
    </Button>
  )

  if (lateral) {
    return (
      <>
        {campana({ onClick: () => cambiarAbierto(!open), expanded: open })}
        <Drawer direction="right" shouldScaleBackground={false} open={open} onOpenChange={cambiarAbierto}>
          <DrawerContent raw fullViewport showHandle={false} onOpenAutoFocus={enfocarPanel}
            // Mismo marco que el panel del contenido: debajo del header (sin header en escritorio, como el
            // evaluador, arranca con el margen exterior), margen a la derecha y abajo, borde y radio de 12px.
            className={cn("bottom-[var(--workspace-inset)] left-auto right-[var(--workspace-inset)] mt-0 w-96 max-w-[calc(100vw-2*var(--workspace-inset))] overflow-hidden rounded-xl border",
              isEvaluador ? "top-[max(var(--workspace-inset),env(safe-area-inset-top,0px))]" : "top-[calc(env(safe-area-inset-top,0px)+var(--workspace-header-height))]")}>
            <div ref={panelRef} tabIndex={-1} className="flex h-full min-h-0 flex-col outline-none">
              {/* Misma altura que el encabezado de la app. */}
              <div className="flex h-[var(--workspace-header-height)] shrink-0 items-center gap-2 border-b border-border pl-3 pr-1">
                <DrawerTitle className="text-label-sm text-foreground">Avisos</DrawerTitle>
                <DrawerDescription className="sr-only">{DESCRIPCION}</DrawerDescription>
                {acciones}
                {cerrar}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{lista}</div>
              {pie}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={cambiarAbierto}>
      <PopoverTrigger asChild>{campana()}</PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden p-0 outline-none" aria-label="Avisos"
        onOpenAutoFocus={enfocarPanel}>
        <div className="flex min-h-(--control-height) items-center gap-2 border-b border-border pl-3 pr-1">
          <h2 className="text-label-sm text-foreground">Avisos</h2>
          {acciones}
          {cerrar}
        </div>
        <div ref={panelRef} tabIndex={-1} className="max-h-[min(28rem,70dvh)] overflow-y-auto overscroll-contain outline-none">{lista}</div>
        {pie}
      </PopoverContent>
    </Popover>
  )
}
