"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence } from "framer-motion"
import { APP_TRANSITION_EXIT_MS, AppTransition, useAppReducedMotion } from "@/components/app-transition"
import { useSignOut } from "@/components/signout-overlay"
import { LOGIN_PATH, POST_LOGIN_PATH } from "@/lib/navigation"

/** Tiempo mínimo en pantalla: evita un parpadeo cuando la página nueva carga al instante. */
const MIN_VISIBLE_MS = 450
/** Si la navegación no llega (p. ej. ruta sin permiso), la capa se retira de todos modos. */
const MAX_VISIBLE_MS = 6000

interface Destino {
  label: string
  path: string
  desde: number
  committed: boolean
}

type StartWorkspaceSwitch = (label: string, path: string, onCovered?: () => void) => void

const WorkspaceSwitchContext = createContext<StartWorkspaceSwitch | null>(null)

function normalizePath(path: string | null): string {
  if (!path || path === "/") return "/"
  return path.replace(/\/+$/, "") || "/"
}

/**
 * Transición al cambiar de espacio de trabajo (Capacitación ⇄ Seguridad e Higiene): la misma
 * capa de carga de la app con "Entrando a …" cubre primero la pantalla, luego ejecuta el cambio
 * de barra lateral y de ruta ya tapado, y se retira con fundido al llegar al inicio del espacio.
 * Vive en el layout porque cada página monta su propio Dashboard.
 */
export function WorkspaceSwitchProvider({ children }: { children: ReactNode }) {
  const [destino, setDestino] = useState<Destino | null>(null)
  const pathname = usePathname()
  const reducedMotion = useAppReducedMotion()
  const { signingOut } = useSignOut()
  const commitTimerRef = useRef<number | null>(null)

  const clearCommitTimer = useCallback(() => {
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current)
      commitTimerRef.current = null
    }
  }, [])

  useEffect(() => clearCommitTimer, [clearCommitTimer])

  // Si empieza el cierre de sesión o una redirección de acceso, libera la capa al instante.
  useEffect(() => {
    if (!destino) return
    const current = normalizePath(pathname)
    if (signingOut || current === LOGIN_PATH || (destino.committed && current === POST_LOGIN_PATH)) {
      clearCommitTimer()
      setDestino(null)
    }
  }, [clearCommitTimer, destino, pathname, signingOut])

  useEffect(() => {
    if (!destino) return
    const transcurrido = performance.now() - destino.desde
    const arrived = destino.committed && normalizePath(pathname) === destino.path
    const minVisible = reducedMotion ? 0 : MIN_VISIBLE_MS
    const espera = arrived ? minVisible - transcurrido : MAX_VISIBLE_MS - transcurrido
    const timer = window.setTimeout(() => {
      clearCommitTimer()
      setDestino(null)
    }, Math.max(0, espera))
    return () => window.clearTimeout(timer)
  }, [clearCommitTimer, destino, pathname, reducedMotion])

  const start = useCallback<StartWorkspaceSwitch>((label, path, onCovered) => {
    if (signingOut) return
    clearCommitTimer()

    // Evita que una pulsación accidental de teclado active botones debajo de la capa.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }

    const normalizedTarget = normalizePath(path)
    const desde = performance.now()

    if (!onCovered || reducedMotion) {
      setDestino({ label, path: normalizedTarget, desde, committed: true })
      onCovered?.()
      return
    }

    setDestino({ label, path: normalizedTarget, desde, committed: false })
    commitTimerRef.current = window.setTimeout(() => {
      commitTimerRef.current = null
      onCovered()
      setDestino(current => (current && current.desde === desde ? { ...current, committed: true } : current))
    }, APP_TRANSITION_EXIT_MS)
  }, [clearCommitTimer, reducedMotion, signingOut])

  return (
    <WorkspaceSwitchContext.Provider value={start}>
      {children}
      <AnimatePresence>
        {destino && (
          <AppTransition
            key="workspace-switch"
            mode="overlay"
            message={destino.label ? `Entrando a ${destino.label}…` : "Cambiando de espacio…"}
          />
        )}
      </AnimatePresence>
    </WorkspaceSwitchContext.Provider>
  )
}

/** Muestra la transición hacia un espacio; ejecuta `onCovered` al cubrir la pantalla y se oculta al llegar a `path`. */
export function useWorkspaceSwitch() {
  const start = useContext(WorkspaceSwitchContext)
  if (!start) throw new Error("useWorkspaceSwitch must be used within WorkspaceSwitchProvider")
  return start
}
