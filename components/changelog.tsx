"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Megaphone as MegaphoneIcon } from "lucide"
import { HardHat, HeartPulse, LayoutDashboard, Megaphone, Monitor, PanelLeft, Search, Tags, UserPlus, UsersRound, X, type LucideIcon } from "lucide-react"
import { useAppReducedMotion } from "@/components/app-transition"
import { Button } from "@/components/ui/button"
import { CompactPager } from "@/components/ui/compact-pager"
import { DialogClose, DialogHeader } from "@/components/ui/dialog"
import { NoticeIcon } from "@/components/ui/notice-icon"
import { ResponsiveShell } from "@/components/ui/responsive-shell"
import { SECTION_NAV_ACTIVE, SECTION_NAV_ICON, SECTION_NAV_IDLE, SECTION_NAV_ITEM } from "@/components/ui/section-nav-layout"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { abrirChangelog, CHANGELOG, cerrarChangelog, type Novedad, type SeccionNovedad } from "@/lib/changelog"
import { useChangelog } from "@/lib/hooks/useChangelog"
import { cn } from "@/lib/utils"

/** No aparece en cuanto carga la página. */
const AVISO_DESPUES_MS = 2_000

/** Mismo ícono que cada sección tiene en el menú (lib/navigation). */
const ICONO_SECCION: Record<SeccionNovedad, LucideIcon> = {
  Inicio: LayoutDashboard,
  Categorías: Tags,
  "Nuevos Empleados": UserPlus,
  Plantilla: UsersRound,
  Búsqueda: Search,
  "Safe Walk": HardHat,
  "Occupational Health": HeartPulse,
  Menú: PanelLeft,
  General: Monitor,
}

/** Cambios agrupados por sección, en el orden en que aparecen. */
function porSeccion(cambios: Novedad["cambios"]): [SeccionNovedad, string[]][] {
  const grupos = new Map<SeccionNovedad, string[]>()
  for (const { seccion, texto } of cambios) grupos.set(seccion, [...(grupos.get(seccion) ?? []), texto])
  return [...grupos]
}

const formatFecha = (fecha: string) =>
  new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${fecha}T00:00:00Z`))

/** Punto de "hay algo nuevo" sobre el ícono. */
export function PuntoNuevo() {
  return <span className="absolute -right-0.5 -top-0.5 size-2 rounded-sm bg-primary" aria-hidden="true" />
}

/** Renglón "Novedades" de la barra lateral (menú móvil y movimiento reducido). */
export function ChangelogButton({ triggerClassName, iconBoxClassName, iconClassName, onOpen }: {
  /** Mismo estilo que los renglones de la navegación. */
  triggerClassName: string
  iconBoxClassName: string
  iconClassName: string
  /** Al abrir (cierra el menú móvil). */
  onOpen?: () => void
}) {
  const { nuevo } = useChangelog()
  return (
    <button
      type="button"
      className={triggerClassName}
      aria-label={nuevo ? "Novedades, hay cambios nuevos" : "Novedades"}
      onClick={() => {
        onOpen?.()
        abrirChangelog()
      }}
    >
      <span className={cn("relative grid shrink-0 place-items-center rounded-md text-muted-foreground", iconBoxClassName)}>
        <Megaphone className={iconClassName} aria-hidden="true" />
        {nuevo && <PuntoNuevo />}
      </span>
      <span className="truncate">Novedades</span>
    </button>
  )
}

/**
 * Aviso flotante de novedades sin ver y modal con paginación por actualización
 * y vista detalle por sección para mantener tamaño fijo sin scroll.
 */
export function Changelog() {
  const { nuevo, abierto } = useChangelog()
  const [listo, setListo] = useState(false)
  const [cerradoAviso, setCerradoAviso] = useState(false)
  const [page, setPage] = useState(1)
  const [selectedSection, setSelectedSection] = useState<SeccionNovedad | null>(null)
  const reduced = useAppReducedMotion()
  const ultima = CHANGELOG[0]

  useEffect(() => {
    const timer = setTimeout(() => setListo(true), AVISO_DESPUES_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (abierto) {
      setPage(1)
      setSelectedSection(null)
    }
  }, [abierto])

  const mostrarAviso = listo && nuevo && !cerradoAviso && !abierto && Boolean(ultima)
  const novedad = CHANGELOG[page - 1] ?? ultima
  const secciones = novedad ? porSeccion(novedad.cambios) : []
  const seccionActiva = secciones.find(([seccion]) => seccion === selectedSection) ?? secciones[0]

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage)
    setSelectedSection(null)
  }

  return (
    <>
      <AnimatePresence>
        {mostrarAviso && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -16 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="app-update-banner"
          >
            <div role="status" aria-live="polite" className="ui-floating-surface flex min-h-14 items-center gap-3 rounded-(--notice-radius) py-2 pl-3 pr-2">
              <NoticeIcon icon={MegaphoneIcon} />
              <div className="min-w-0 flex-1">
                <p className="break-words text-label-sm text-foreground">Novedades en el sistema</p>
                <p className="break-words text-body-sm text-muted-foreground">{ultima.titulo}</p>
              </div>
              <Button type="button" size="sm" className="shrink-0" onClick={abrirChangelog}>
                Ver
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="size-8 shrink-0 px-0 text-muted-foreground hover:text-foreground"
                aria-label="Cerrar aviso de novedades"
                onClick={() => setCerradoAviso(true)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ResponsiveShell
        open={abierto}
        onClose={cerrarChangelog}
        size="md"
        title={novedad ? `Novedades: ${novedad.titulo}` : "Novedades"}
        description="Cambios recientes en el sistema."
      >
        {novedad && (
          <>
            <DialogHeader className="sticky top-0 z-10 mb-0 flex-row items-start justify-between gap-4 border-b border-border bg-card px-4 py-3 text-left sm:px-6">
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-body-sm text-muted-foreground">
                  Novedades · <time dateTime={novedad.fecha}>{formatFecha(novedad.fecha)}</time>
                </p>
                <h2 className="break-words text-heading-md text-foreground">{novedad.titulo}</h2>
              </div>
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Cerrar modal">
                  <X aria-hidden="true" />
                </Button>
              </DialogClose>
            </DialogHeader>

            <div className="grid min-h-0 flex-1 grid-cols-1 bg-card sm:h-[19rem] sm:flex-none sm:grid-cols-[12.5rem_minmax(0,1fr)]">
              <div className="border-b border-border px-4 py-3 sm:border-b-0 sm:border-r sm:px-3 sm:py-4">
                <Select
                  value={seccionActiva?.[0] ?? ""}
                  onValueChange={next => {
                    const match = secciones.find(([s]) => s === next)
                    if (match) setSelectedSection(match[0])
                  }}
                >
                  <SelectTrigger aria-label="Apartados de esta actualización" className="w-full sm:hidden">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {secciones.map(([seccion]) => (
                      <SelectItem key={seccion} value={seccion}>{seccion}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <nav aria-label="Apartados de esta actualización" className="hidden sm:block">
                  <ul className="space-y-0.5">
                    {secciones.map(([seccion]) => {
                      const Icon = ICONO_SECCION[seccion]
                      const current = seccionActiva?.[0] === seccion
                      return (
                        <li key={seccion}>
                          <button
                            type="button"
                            aria-current={current || undefined}
                            onClick={() => setSelectedSection(seccion)}
                            className={cn(SECTION_NAV_ITEM, current ? SECTION_NAV_ACTIVE : SECTION_NAV_IDLE)}
                          >
                            <Icon className={cn(SECTION_NAV_ICON, current && "text-primary")} aria-hidden="true" />
                            <span className="min-w-0 truncate">{seccion}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </nav>
              </div>

              <div className="min-h-[15rem] overflow-y-auto px-4 py-4 sm:min-h-0 sm:px-6">
                {seccionActiva && (
                  <section
                    key={`${novedad.id}-${seccionActiva[0]}`}
                    aria-label={seccionActiva[0]}
                    className="step-enter"
                  >
                    <h3 className="sr-only">{seccionActiva[0]}</h3>
                    <ul className="list-disc space-y-2.5 pl-5 text-body-md text-foreground marker:text-muted-foreground">
                      {seccionActiva[1].map(texto => (
                        <li key={texto}>{texto}</li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </div>

            <div className="mt-auto flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:px-6 sm:pb-3">
              <div>
                <CompactPager
                  label="Paginación de novedades"
                  page={page}
                  totalPages={CHANGELOG.length}
                  onPageChange={handlePageChange}
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={cerrarChangelog}>
                Cerrar
              </Button>
            </div>
          </>
        )}
      </ResponsiveShell>
    </>
  )
}
