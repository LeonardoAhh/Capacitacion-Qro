"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { APP_TRANSITION_EASE, useAppReducedMotion } from "@/components/app-transition"

const UNIDADES = [
  { label: "días", seconds: 86400, modulo: null },
  { label: "horas", seconds: 3600, modulo: 24 },
  { label: "min", seconds: 60, modulo: 60 },
  { label: "seg", seconds: 1, modulo: 60 },
] as const

const FIN = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })

/** Segundos que faltan; null hasta el primer tic (el servidor no conoce la hora del cliente). */
function useRestante(deadline: number) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const initial = window.setTimeout(tick, 0)
    const timer = window.setInterval(tick, 1000)
    // Al volver a una pestaña suspendida, se recalcula desde la fecha de fin.
    window.addEventListener("focus", tick)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(timer)
      window.removeEventListener("focus", tick)
    }
  }, [])
  return now === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000))
}

/** Un número que entra desde abajo al cambiar (sin animación con "Reducir movimiento"). */
function Digitos({ value }: { value: string }) {
  const reducedMotion = useAppReducedMotion()
  return (
    <span className="relative inline-grid overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span key={value} className="col-start-1 row-start-1"
          initial={reducedMotion ? false : { y: "60%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reducedMotion ? undefined : { y: "-60%", opacity: 0 }}
          transition={{ duration: 0.28, ease: APP_TRANSITION_EASE }}>
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/**
 * Tiempo estimado de regreso: días (solo si quedan), horas, minutos y segundos, y la hora
 * de fin en la zona del dispositivo. Al vencer, un aviso breve en lugar del contador.
 */
export function MaintenanceCountdown({ deadline }: { deadline: number }) {
  const restante = useRestante(deadline)

  if (restante === 0) {
    return (
      <p role="status" className="text-body-md text-muted-foreground">
        Está tomando un poco más de lo previsto. Gracias por tu paciencia.
      </p>
    )
  }

  const unidades = UNIDADES.filter(unidad => unidad.modulo !== null || restante === null || restante >= unidad.seconds)

  return (
    <div className="grid justify-items-center gap-3">
      {/* El lector de pantalla no anuncia cada segundo (aria-live="off"). */}
      <dl role="timer" aria-live="off" aria-label="Tiempo estimado restante" className="flex gap-2">
        {unidades.map(({ label, seconds, modulo }) => {
          const total = restante === null ? null : Math.floor(restante / seconds)
          const valor = total === null ? "—" : String(modulo === null ? total : total % modulo).padStart(2, "0")
          return (
            <div key={label} className="flex min-w-16 flex-col items-center gap-1 rounded-lg border bg-card px-3 py-2">
              {/* dt antes que dd (orden válido de <dl>); la etiqueta se ve debajo del número. */}
              <dt className="order-last text-eyebrow uppercase text-muted-foreground">{label}</dt>
              <dd className="text-heading-lg tabular-nums text-foreground"><Digitos value={valor} /></dd>
            </div>
          )
        })}
      </dl>
      <p className="text-body-sm text-muted-foreground">
        Fin estimado · <time dateTime={new Date(deadline).toISOString()} className="text-foreground">{FIN.format(deadline)}</time>
      </p>
    </div>
  )
}
