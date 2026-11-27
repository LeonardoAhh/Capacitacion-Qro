"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { WifiOff } from "lucide-react"
import { useAppReducedMotion } from "@/components/app-transition"
import { notify } from "@/lib/notify"

/**
 * Indicador global de conexión:
 * - Toast "Sin conexión" cuando cae la red (con debounce de 1.5s para evitar parpadeos).
 * - Toast "Conexión restablecida" cuando vuelve.
 * - Insignia fija arriba al centro mientras no hay red.
 */
export function ConnectionStatus() {
  const [offline, setOffline] = useState(false)
  const reducedMotion = useAppReducedMotion()
  const offlineToast = useRef<string | number | null>(null)
  const wasOnline = useRef<boolean>(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    wasOnline.current = navigator.onLine
    setOffline(!navigator.onLine)

    const handleOffline = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        if (navigator.onLine) return // recovered within the debounce window
        wasOnline.current = false
        setOffline(true)
        offlineToast.current = notify.error("Sin conexión", {
          description: "Revisa tu internet; verás lo último guardado",
          duration: Infinity,
        })
      }, 1500)
    }

    const handleOnline = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      setOffline(false)
      if (offlineToast.current !== null) {
        notify.dismiss(offlineToast.current)
        offlineToast.current = null
      }
      if (!wasOnline.current) {
        wasOnline.current = true
        notify.success("Conexión restablecida")
      }
    }

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)
    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (offlineToast.current !== null) notify.dismiss(offlineToast.current)
    }
  }, [])

  return (
    <AnimatePresence>
      {offline ? (
        <motion.div
          role="status"
          aria-live="polite"
          initial={reducedMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: reducedMotion ? 0 : 0.18 }}
          className="pointer-events-none fixed left-1/2 top-[max(env(safe-area-inset-top),0.75rem)] z-[60] -translate-x-1/2"
        >
          <div className="pointer-events-auto flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-body-sm font-medium text-foreground shadow-(--floating-shadow)">
            <WifiOff className="size-3.5 text-warning-deep" aria-hidden="true" />
            <span>Sin conexión</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
