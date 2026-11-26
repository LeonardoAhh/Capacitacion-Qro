"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Megaphone as MegaphoneIcon } from "lucide"
import { LayoutDashboard, Megaphone, PanelLeft, UsersRound, X, type LucideIcon } from "lucide-react"
import { useAppReducedMotion } from "@/components/app-transition"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { NoticeIcon } from "@/components/ui/notice-icon"
import { abrirChangelog, CHANGELOG, cerrarChangelog, type Novedad, type SeccionNovedad } from "@/lib/changelog"
import { useChangelog } from "@/lib/hooks/useChangelog"
import { cn } from "@/lib/utils"

/** No aparece en cuanto carga la página. */
const AVISO_DESPUES_MS = 2_000

/** Mismo ícono que cada sección tiene en el menú (lib/navigation). */
const ICONO_SECCION: Record<SeccionNovedad, LucideIcon> = {
  Inicio: LayoutDashboard,
  Plantilla: UsersRound,
  Menú: PanelLeft,
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
 * Aviso flotante de novedades sin ver y la lista completa. Se monta una sola vez en el workspace;
 * el aviso se cierra por esta visita, el punto del botón sigue hasta abrir la lista.
 */
export function Changelog() {
  const { nuevo, abierto } = useChangelog()
  const [listo, setListo] = useState(false)
  const [cerradoAviso, setCerradoAviso] = useState(false)
  const reduced = useAppReducedMotion()
  const ultima = CHANGELOG[0]

  useEffect(() => {
    const timer = setTimeout(() => setListo(true), AVISO_DESPUES_MS)
    return () => clearTimeout(timer)
  }, [])

  const mostrarAviso = listo && nuevo && !cerradoAviso && !abierto && Boolean(ultima)

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

      <Dialog open={abierto} onOpenChange={open => { if (!open) cerrarChangelog() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novedades</DialogTitle>
            <DialogDescription className="sr-only">Cambios recientes en el sistema.</DialogDescription>
          </DialogHeader>
          {/* Cada novedad: fecha y título; debajo, sus cambios agrupados por sección del menú. */}
          <ol className="divide-y pb-2">
            {CHANGELOG.map(novedad => (
              <li key={novedad.id} className="space-y-4 py-4 first:pt-2">
                <div>
                  <p className="text-body-sm text-muted-foreground">
                    <time dateTime={novedad.fecha}>{formatFecha(novedad.fecha)}</time>
                  </p>
                  <h3 className="text-heading-md text-foreground">{novedad.titulo}</h3>
                </div>
                {porSeccion(novedad.cambios).map(([seccion, textos]) => {
                  const Icon = ICONO_SECCION[seccion]
                  return (
                    <section key={seccion} aria-label={seccion} className="space-y-1">
                      <h4 className="flex items-center gap-2 text-label-sm text-foreground">
                        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        {seccion}
                      </h4>
                      <ul className="list-disc space-y-1 pl-6 text-body-md text-foreground marker:text-muted-foreground">
                        {textos.map(texto => <li key={texto}>{texto}</li>)}
                      </ul>
                    </section>
                  )
                })}
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
    </>
  )
}
