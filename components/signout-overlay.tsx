"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence } from "framer-motion"
import { AppTransition } from "@/components/app-transition"
import { LOGIN_PATH } from "@/lib/navigation"

/** Tiempo mínimo en pantalla para evitar un parpadeo cuando el cierre local es instantáneo. */
const MIN_VISIBLE_MS = 450
/** Respaldo por si la navegación a /login se interrumpe. */
const MAX_VISIBLE_MS = 6000

interface SignOutContextValue {
  signingOut: boolean
  setSigningOut: (signingOut: boolean) => void
}

const SignOutContext = createContext<SignOutContextValue | null>(null)

export function SignOutProvider({ children }: { children: ReactNode }) {
  const [desde, setDesde] = useState<number | null>(null)
  const pathname = usePathname()
  const signingOut = desde !== null

  const setSigningOut = useCallback((next: boolean) => {
    setDesde(current => (next ? (current ?? Date.now()) : null))
  }, [])

  useEffect(() => {
    if (desde === null) return
    const transcurrido = Date.now() - desde
    const espera = pathname === LOGIN_PATH ? MIN_VISIBLE_MS - transcurrido : MAX_VISIBLE_MS - transcurrido
    const timer = window.setTimeout(() => setDesde(null), Math.max(0, espera))
    return () => window.clearTimeout(timer)
  }, [desde, pathname])

  return (
    <SignOutContext.Provider value={{ signingOut, setSigningOut }}>
      {children}
      <AnimatePresence>
        {signingOut && <AppTransition key="signout" mode="overlay" message="Cerrando sesión…" />}
      </AnimatePresence>
    </SignOutContext.Provider>
  )
}

export function useSignOut() {
  const context = useContext(SignOutContext)
  if (!context) throw new Error("useSignOut must be used within SignOutProvider")
  return context
}
