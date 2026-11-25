"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence } from "framer-motion"
import { AppTransition } from "@/components/app-transition"

/** Tiempo mínimo en pantalla: evita un parpadeo cuando la página nueva carga al instante. */
const MIN_VISIBLE_MS = 900
/** Si la navegación no llega (p. ej. ruta sin permiso), la capa se retira de todos modos. */
const MAX_VISIBLE_MS = 6000

interface Destino {
  label: string
  path: string
  desde: number
}

const WorkspaceSwitchContext = createContext<((label: string, path: string) => void) | null>(null)

/**
 * Transición al cambiar de espacio de trabajo (Capacitación ⇄ Seguridad e Higiene): la misma
 * capa de carga de la app con "Entrando a …" cubre el cambio de barra lateral y de página, y se
 * retira con fundido al llegar al inicio del espacio. Vive en el layout porque cada página monta
 * su propio Dashboard.
 */
export function WorkspaceSwitchProvider({ children }: { children: ReactNode }) {
  const [destino, setDestino] = useState<Destino | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    if (!destino) return
    const transcurrido = Date.now() - destino.desde
    const espera = pathname === destino.path ? MIN_VISIBLE_MS - transcurrido : MAX_VISIBLE_MS - transcurrido
    const timer = window.setTimeout(() => setDestino(null), Math.max(0, espera))
    return () => window.clearTimeout(timer)
  }, [destino, pathname])

  const start = useCallback((label: string, path: string) => setDestino({ label, path, desde: Date.now() }), [])

  return (
    <WorkspaceSwitchContext.Provider value={start}>
      {children}
      <AnimatePresence>
        {destino && <AppTransition key="workspace-switch" mode="overlay" message={`Switching workspace…`} />}
      </AnimatePresence>
    </WorkspaceSwitchContext.Provider>
  )
}

/** Muestra la transición hacia un espacio; se oculta sola al llegar a `path`. */
export function useWorkspaceSwitch() {
  const start = useContext(WorkspaceSwitchContext)
  if (!start) throw new Error("useWorkspaceSwitch must be used within WorkspaceSwitchProvider")
  return start
}
