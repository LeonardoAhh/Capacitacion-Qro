"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useTheme } from "@/components/theme-context"
import { WorkspaceLandscape } from "@/components/WorkspaceLandscape"
import PluckedText from "@/components/ui/PluckedText"

export const APP_TRANSITION_MIN_MS = 2000
export const APP_TRANSITION_EXIT_MS = 350
/** Salida rápida y frenado suave: la misma curva en todas las transiciones de acceso. */
export const APP_TRANSITION_EASE = [0.22, 1, 0.36, 1] as const
const APP_MARK_MASK = "url('/icons/icon.svg') center / contain no-repeat"

interface AppTransitionProps {
  message: string
  mode?: "page" | "overlay"
  leaving?: boolean
}

export function useAppReducedMotion() {
  const systemReducedMotion = useReducedMotion() ?? false
  const { reducedMotion } = useTheme()
  return systemReducedMotion || reducedMotion
}

export function AppMark({ className }: { className: string }) {
  const reducedMotion = useAppReducedMotion()

  return (
    <motion.span
      aria-hidden="true"
      className={`block bg-foreground ${className}`}
      style={{ mask: APP_MARK_MASK, WebkitMask: APP_MARK_MASK }}
      initial={false}
      animate={
        reducedMotion
          ? { opacity: 1, scale: 1 }
          : { opacity: [0.7, 1, 0.7], scale: [0.96, 1, 0.96] }
      }
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration: 2.2, ease: "easeInOut", repeat: Infinity }
      }
    />
  )
}

/**
 * Pantalla de carga entre login, selección de espacio y workspace. El paisaje
 * queda fijo para dar continuidad; solo el mensaje entra y, con `leaving`,
 * sale antes de navegar. Como capa (cerrar sesión) aparece y se va con fundido.
 */
export function AppTransition({
  message,
  mode = "page",
  leaving = false,
}: AppTransitionProps) {
  const reducedMotion = useAppReducedMotion()
  const transition = { duration: reducedMotion ? 0 : APP_TRANSITION_EXIT_MS / 1000, ease: APP_TRANSITION_EASE }

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-busy="true"
      initial={mode === "overlay" ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transition}
      className={
        mode === "overlay"
          ? "workspace-shell fixed inset-0 z-[200] bg-background text-foreground"
          : "workspace-shell bg-background text-foreground"
      }
    >
      <div className="workspace-panel min-h-0 overflow-hidden bg-card md:rounded-xl md:border md:border-border">
        <WorkspaceLandscape isStatic className="h-full min-h-0">
          <motion.div
            className="flex h-full items-center justify-center px-6 text-center"
            initial={{ opacity: 0, y: 8 }}
            animate={leaving ? { opacity: 0, y: -8 } : { opacity: 1, y: 0 }}
            transition={transition}
          >
            <span className="sr-only">{message}</span>
            <span aria-hidden="true" className="pointer-events-none text-heading-md text-foreground sm:text-heading-lg">
              {reducedMotion ? message : <PluckedText text={message} loop strum={false} />}
            </span>
          </motion.div>
        </WorkspaceLandscape>
      </div>
    </motion.div>
  )
}
