"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { CheckCircle2, CircleDot, Clock, Inbox, Lightbulb, RotateCw, TriangleAlert, X, type LucideIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CompactPager } from "@/components/ui/compact-pager"
import { HeaderSearch } from "@/components/ui/header-search"
import { Label } from "@/components/ui/label"
import { SECTION_NAV_ACTIVE, SECTION_NAV_ICON, SECTION_NAV_IDLE, SECTION_NAV_ITEM } from "@/components/ui/section-nav-layout"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { aISO, formatFechaCorta } from "@/lib/fechas"
import {
  cambiarEstadoIdea,
  cargarIdeas,
  ESTADOS_IDEA,
  obtenerIdeasCache,
  type EstadoIdea,
  type Idea,
} from "@/lib/ideas"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10
const TODAS = "todas"
type FiltroEstado = EstadoIdea | typeof TODAS

interface QueueMeta {
  id: FiltroEstado
  label: string
  icon: LucideIcon
  emptyText: string
}

const QUEUES: readonly QueueMeta[] = [
  { id: TODAS, label: "Todas", icon: Inbox, emptyText: "Todavía no hay ideas registradas." },
  { id: "nueva", label: "Nuevas", icon: CircleDot, emptyText: "No hay ideas nuevas pendientes." },
  { id: "en_revision", label: "En revisión", icon: Clock, emptyText: "No hay ideas en revisión." },
  { id: "hecha", label: "Hechas", icon: CheckCircle2, emptyText: "Todavía no hay ideas marcadas como hechas." },
]

const ESTADO_META: Record<EstadoIdea, { label: string; icon: LucideIcon; iconClass: string }> = {
  nueva: { label: "Nueva", icon: CircleDot, iconClass: "text-primary" },
  en_revision: { label: "En revisión", icon: Clock, iconClass: "text-warning-deep" },
  hecha: { label: "Hecha", icon: CheckCircle2, iconClass: "text-chart-1-deep" },
}

const SKELETON_LINE_WIDTHS = ["w-3/4", "w-2/3", "w-4/5", "w-1/2"] as const

// Día local en que se envió (no UTC).
const fechaCorta = (idea: Idea) => formatFechaCorta(aISO(new Date(idea.creada)))

const fechaCompleta = (idea: Idea) =>
  new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short" }).format(new Date(idea.creada))

const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-MX")

function EstadoSelect({
  idea,
  disabled,
  onChange,
}: {
  idea: Idea
  disabled: boolean
  onChange: (estado: EstadoIdea) => void
}) {
  const actual = ESTADO_META[idea.estado]

  return (
    <Select
      value={idea.estado}
      disabled={disabled}
      onValueChange={(value) => onChange(value as EstadoIdea)}
    >
      <SelectTrigger
        variant="ghost"
        aria-label={`Estado de la idea de ${idea.autor}: ${actual.label}`}
        aria-busy={disabled || undefined}
        className="relative touch-target h-(--control-height-sm) min-w-[9rem] border border-border bg-transparent px-2.5 text-body-sm hover:bg-muted data-[state=open]:bg-muted"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {ESTADOS_IDEA.map((item) => {
          const meta = ESTADO_META[item.value]
          const ItemIcon = meta.icon
          return (
            <SelectItem key={item.value} value={item.value}>
              <span className="flex items-center gap-2">
                <ItemIcon className={cn("size-4 shrink-0", meta.iconClass)} aria-hidden="true" />
                <span>{meta.label}</span>
              </span>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

function IdeasSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando ideas"
      className="grid items-start gap-6 dense:gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]"
    >
      <div aria-hidden="true" className="min-w-0">
        <Skeleton className="h-(--control-height) w-full rounded-md lg:hidden" />
        <div className="hidden space-y-1 lg:block">
          {QUEUES.map((queue) => (
            <div key={queue.id} className="flex min-h-(--control-height) items-center gap-2 px-2">
              <Skeleton className="size-4 shrink-0 rounded-sm" />
              <Skeleton className="h-4 w-20 flex-1" />
              <Skeleton className="h-3.5 w-5 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      <div aria-hidden="true" className="min-w-0 max-w-4xl">
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5"
            >
              <div className="min-w-0 flex-1 space-y-2.5">
                <Skeleton className={cn("h-4 max-w-full", SKELETON_LINE_WIDTHS[index % SKELETON_LINE_WIDTHS.length])} />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-24 rounded-md" />
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-14" />
                </div>
              </div>
              <Skeleton className="h-(--control-height-sm) w-36 shrink-0 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Bandeja de revisión de ideas de mejora (solo roles con canReviewIdeas). */
export function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[] | null>(() => obtenerIdeasCache())
  const [loadError, setLoadError] = useState<string | null>(null)
  const [estado, setEstado] = useState<FiltroEstado>(TODAS)
  const [seccion, setSeccion] = useState<string>(TODAS)
  const [busqueda, setBusqueda] = useState("")
  const [page, setPage] = useState(1)
  const [savingIds, setSavingIds] = useState<ReadonlySet<string>>(() => new Set())
  const headingId = useId()
  const requestIdRef = useRef(0)

  const cargar = useCallback(async (force = false) => {
    const requestId = ++requestIdRef.current
    setLoadError(null)
    if (force) setIdeas(null)
    try {
      const rows = await cargarIdeas(force)
      if (requestId === requestIdRef.current) setIdeas(rows)
    } catch {
      if (requestId === requestIdRef.current) {
        setLoadError("No se pudieron cargar las ideas de mejora.")
      }
    }
  }, [])

  useEffect(() => {
    void cargar(false)
  }, [cargar])

  useEffect(() => {
    setPage(1)
  }, [estado, seccion, busqueda])

  const conteos = useMemo(() => {
    const counts: Record<FiltroEstado, number> = { todas: 0, nueva: 0, en_revision: 0, hecha: 0 }
    if (!ideas) return counts
    counts.todas = ideas.length
    for (const idea of ideas) counts[idea.estado] += 1
    return counts
  }, [ideas])

  const secciones = useMemo(() => {
    if (!ideas) return []
    return [...new Set(ideas.map((idea) => idea.seccion))].sort((a, b) => a.localeCompare(b, "es-MX"))
  }, [ideas])

  // Optimista: actualiza al instante y revierte si la base rechaza el cambio.
  async function cambiarEstado(idea: Idea, nextEstado: EstadoIdea) {
    if (idea.estado === nextEstado || savingIds.has(idea.id)) return
    setSavingIds((prev) => new Set(prev).add(idea.id))
    setIdeas((current) => current?.map((item) => (item.id === idea.id ? { ...item, estado: nextEstado } : item)) ?? current)

    try {
      await cambiarEstadoIdea(idea.id, nextEstado)
      if (estado !== TODAS && nextEstado !== estado) {
        notify.success(`Idea movida a ${ESTADO_META[nextEstado].label}`)
      }
    } catch {
      setIdeas((current) => current?.map((item) => (item.id === idea.id ? { ...item, estado: idea.estado } : item)) ?? current)
      notify.error("No se pudo cambiar el estado de la idea.")
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(idea.id)
        return next
      })
    }
  }

  if (loadError) {
    return (
      <div className="max-w-4xl">
        <Alert variant="destructive">
          <TriangleAlert className="size-4" aria-hidden="true" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{loadError}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="touch-target"
              onClick={() => void cargar(true)}
            >
              <RotateCw aria-hidden="true" />
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!ideas) return <IdeasSkeleton />

  const termino = normalizar(busqueda.trim())
  const seccionActiva = seccion === TODAS || secciones.includes(seccion) ? seccion : TODAS
  const visibles = ideas.filter((idea) => {
    if (estado !== TODAS && idea.estado !== estado) return false
    if (seccionActiva !== TODAS && idea.seccion !== seccionActiva) return false
    if (!termino) return true
    return normalizar(`${idea.texto} ${idea.seccion} ${idea.autor}`).includes(termino)
  })

  const totalPages = Math.max(1, Math.ceil(visibles.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginadas = visibles.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const activeQueue = QUEUES.find((item) => item.id === estado) ?? QUEUES[0]
  const hasSecondaryFilters = seccionActiva !== TODAS || busqueda.trim() !== ""
  const showToolbar = secciones.length > 1 || hasSecondaryFilters || totalPages > 1

  const clearSecondaryFilters = () => {
    setSeccion(TODAS)
    setBusqueda("")
  }

  return (
    <>
      <HeaderSearch
        label="Buscar ideas"
        placeholder="Idea, sección o persona…"
        value={busqueda}
        onValueChange={setBusqueda}
      />

      <div className="grid items-start gap-6 dense:gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-0">
          <Label htmlFor="ideas-estado-movil" className="sr-only">Filtrar por estado</Label>
          <Select value={estado} onValueChange={(value) => setEstado(value as FiltroEstado)}>
            <SelectTrigger id="ideas-estado-movil" className="w-full lg:hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUEUES.map((queue) => (
                <SelectItem key={queue.id} value={queue.id}>
                  {queue.label} ({conteos[queue.id]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <nav aria-label="Estados de ideas" className="hidden lg:block">
            <ul className="space-y-0.5">
              {QUEUES.map(({ id, label, icon: Icon }) => {
                const current = id === estado
                return (
                  <li key={id}>
                    <button
                      type="button"
                      aria-current={current ? "page" : undefined}
                      onClick={() => setEstado(id)}
                      className={cn(SECTION_NAV_ITEM, current ? SECTION_NAV_ACTIVE : SECTION_NAV_IDLE)}
                    >
                      <Icon className={cn(SECTION_NAV_ICON, current && "text-primary")} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      <span className={cn("shrink-0 text-body-sm tabular-nums", current ? "text-foreground" : "text-muted-foreground")}>
                        {conteos[id]}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        <section aria-labelledby={headingId} className="grid min-w-0 max-w-4xl gap-4 dense:gap-3">
          <h2 id={headingId} className="sr-only">{activeQueue.label}</h2>

          {showToolbar && (
            <div className="flex flex-wrap items-center gap-2">
              {secciones.length > 1 && (
                <>
                  <Label htmlFor="ideas-seccion" className="sr-only">Sección</Label>
                  <Select value={seccionActiva} onValueChange={setSeccion}>
                    <SelectTrigger id="ideas-seccion" className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TODAS}>Secciones</SelectItem>
                      {secciones.map((nombre) => (
                        <SelectItem key={nombre} value={nombre}>{nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              {hasSecondaryFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="touch-target"
                  onClick={clearSecondaryFilters}
                  aria-label="Limpiar filtros"
                >
                  <X aria-hidden="true" />
                  Limpiar
                </Button>
              )}

              <div className="ml-auto flex items-center gap-3">
                {hasSecondaryFilters && (
                  <p className="text-body-sm tabular-nums text-muted-foreground" aria-live="polite">
                    {visibles.length} de {conteos[estado]} {conteos[estado] === 1 ? "idea" : "ideas"}
                  </p>
                )}
                <CompactPager label="Paginación de ideas" page={safePage} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </div>
          )}

          <div key={estado} className="step-enter overflow-hidden rounded-xl border border-border bg-card">
            {visibles.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <Lightbulb className="size-5 text-muted-foreground" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="text-label-sm text-foreground">
                    {ideas.length === 0
                      ? "Todavía no hay ideas registradas"
                      : hasSecondaryFilters
                        ? "Ninguna idea coincide con tu búsqueda"
                        : activeQueue.emptyText}
                  </p>
                  {ideas.length === 0 && (
                    <p className="max-w-md text-body-sm text-muted-foreground">
                      Las sugerencias que envíe el equipo desde Ideas de mejora en la barra lateral aparecerán aquí.
                    </p>
                  )}
                </div>
                {hasSecondaryFilters ? (
                  <Button type="button" variant="outline" size="sm" className="touch-target" onClick={clearSecondaryFilters}>
                    Limpiar filtros
                  </Button>
                ) : estado !== TODAS && ideas.length > 0 ? (
                  <Button type="button" variant="outline" size="sm" className="touch-target" onClick={() => setEstado(TODAS)}>
                    Ver todas
                  </Button>
                ) : null}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {paginadas.map((idea) => (
                  <li
                    key={idea.id}
                    className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="max-w-[70ch] whitespace-pre-wrap break-words text-body-md text-foreground">
                        {idea.texto}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-muted-foreground">
                        <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 text-body-sm text-foreground">
                          {idea.seccion}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{idea.autor}</span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={idea.creada} title={fechaCompleta(idea)} className="tabular-nums">
                          {fechaCorta(idea)}
                        </time>
                      </div>
                    </div>

                    <div className="shrink-0 self-start sm:self-center">
                      <EstadoSelect
                        idea={idea}
                        disabled={savingIds.has(idea.id)}
                        onChange={(nextEstado) => void cambiarEstado(idea, nextEstado)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
