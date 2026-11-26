"use client"

import { useEffect, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Lightbulb, Megaphone } from "lucide"
import { MorphIcon } from "morphicons/react"
import { useAppReducedMotion } from "@/components/app-transition"
import { ChangelogButton, PuntoNuevo } from "@/components/changelog"
import { IdeaCapture } from "@/components/idea-capture"
import { abrirChangelog } from "@/lib/changelog"
import { useChangelog } from "@/lib/hooks/useChangelog"
import type { WorkspaceId } from "@/lib/navigation"
import { cn } from "@/lib/utils"

/** Tiempo que se muestra cada acción antes de alternar. */
const ALTERNAR_CADA_MS = 5_000

const ACCIONES = {
  ideas: { label: "Ideas de mejora", icon: Lightbulb },
  novedades: { label: "Novedades", icon: Megaphone },
} as const

type Accion = keyof typeof ACCIONES

/**
 * Pie de la barra de escritorio: un renglón que alterna "Ideas de mejora" y "Novedades"
 * (el ícono se transforma y el texto se desvanece). Se detiene al pasar el mouse, al
 * enfocarlo o con algo abierto; con novedades sin ver se queda en Novedades. Con
 * movimiento reducido no alterna y muestra los dos renglones.
 */
export function SidebarAcciones({ workspace, showNovedades, aside, triggerClassName, iconBoxClassName, iconClassName }: {
  workspace: WorkspaceId
  /** Sin Novedades (evaluador) queda solo Ideas de mejora, sin alternar. */
  showNovedades: boolean
  /** Junto al renglón de Ideas, en su misma fila (campana del evaluador). */
  aside?: ReactNode
  triggerClassName: string
  iconBoxClassName: string
  iconClassName: string
}) {
  const reduced = useAppReducedMotion()
  const { nuevo, abierto: novedadesAbiertas } = useChangelog()
  const [rotada, setRotada] = useState<Accion>("ideas")
  const [ideasAbiertas, setIdeasAbiertas] = useState(false)
  const [enUso, setEnUso] = useState(false)

  const actual: Accion = !showNovedades ? "ideas" : nuevo ? "novedades" : rotada
  const pausada = !showNovedades || reduced || nuevo || enUso || ideasAbiertas || novedadesAbiertas

  useEffect(() => {
    if (pausada) return
    const timer = setInterval(() => setRotada(current => current === "ideas" ? "novedades" : "ideas"), ALTERNAR_CADA_MS)
    return () => clearInterval(timer)
  }, [pausada])

  if (!showNovedades) {
    return <IdeaCapture workspace={workspace} aside={aside} triggerClassName={triggerClassName} iconBoxClassName={iconBoxClassName} iconClassName={iconClassName} />
  }

  if (reduced) {
    return (
      <>
        <IdeaCapture workspace={workspace} aside={aside} triggerClassName={triggerClassName} iconBoxClassName={iconBoxClassName} iconClassName={iconClassName} />
        <ChangelogButton triggerClassName={triggerClassName} iconBoxClassName={iconBoxClassName} iconClassName={iconClassName} />
      </>
    )
  }

  const { label, icon } = ACCIONES[actual]
  return (
    <IdeaCapture
      workspace={workspace}
      triggerClassName={triggerClassName}
      iconBoxClassName={iconBoxClassName}
      iconClassName={iconClassName}
      onOpenChange={setIdeasAbiertas}
      aside={aside}
      trigger={
        <button
          type="button"
          className={triggerClassName}
          aria-label={actual === "novedades" && nuevo ? "Novedades, hay cambios nuevos" : label}
          onPointerEnter={() => setEnUso(true)}
          onPointerLeave={() => setEnUso(false)}
          onFocus={() => setEnUso(true)}
          onBlur={() => setEnUso(false)}
          onClick={event => {
            if (actual !== "novedades") return
            // Novedades no abre la captura de ideas: se cancela el clic del disparador.
            event.preventDefault()
            abrirChangelog()
          }}
        >
          <span className={cn("relative grid shrink-0 place-items-center rounded-md text-muted-foreground", iconBoxClassName)} aria-hidden="true">
            <MorphIcon icon={icon} size={14} strokeWidth={2} spring="snappy" reducedMotion="user" />
            {actual === "novedades" && nuevo && <PuntoNuevo />}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={actual}
              className="truncate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </button>
      }
    />
  )
}
