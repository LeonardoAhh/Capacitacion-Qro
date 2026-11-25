"use client"

import { useId } from "react"
import { motion } from "framer-motion"
import { APP_TRANSITION_EASE, useAppReducedMotion } from "@/components/app-transition"
import { MaintenanceCountdown } from "@/components/maintenance-countdown"
import { WorkspaceBackdrop } from "@/components/workspace-backdrop"

/**
 * Pantalla de mantenimiento (producción): la misma superficie de las pantallas de acceso
 * (fondo de líneas). A la izquierda, el mensaje; a la derecha, el tiempo
 * estimado (cuenta regresiva o, sin hora de fin, un aviso). El acceso vuelve solo cuando termina (MaintenanceGuard).
 */
export function MaintenanceScreen({ endsAt = null }: { endsAt?: string | null }) {
  const id = useId()
  const reducedMotion = useAppReducedMotion()
  const deadline = endsAt ? Date.parse(endsAt) : NaN

  return (
    <main aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} className="workspace-shell bg-background text-foreground">
      <div className="workspace-panel min-h-0 overflow-hidden bg-card md:rounded-xl md:border md:border-border">
        <WorkspaceBackdrop className="sm:min-h-dvh md:h-full md:min-h-0">
          {/* Dos columnas desde md: mensaje a la izquierda y tiempo estimado a la derecha;
              en celular, una debajo de la otra y centradas. */}
          <motion.div
            className="mx-auto grid h-full min-h-dvh w-full max-w-4xl content-center items-center gap-10 px-6 py-12 md:min-h-0 md:grid-cols-2 md:gap-16"
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: APP_TRANSITION_EASE }}
          >
            <div className="grid justify-items-center gap-4 text-center md:justify-items-start md:text-left">
              <p className="text-eyebrow uppercase text-muted-foreground">Mantenimiento</p>
              <h1 id={`${id}-title`} className="text-balance text-heading-lg text-foreground sm:text-heading-xl">
                Estamos mejorando el sistema
              </h1>
              <p id={`${id}-description`} className="max-w-sm text-pretty text-body-md text-muted-foreground">
                Volverás automáticamente en cuanto termine.
              </p>
            </div>
            <section aria-label="Tiempo estimado" className="grid justify-items-center gap-4 rounded-xl border bg-card p-6 text-center">
              <p className="text-eyebrow uppercase text-muted-foreground">Tiempo estimado</p>
              {Number.isFinite(deadline)
                ? <MaintenanceCountdown deadline={deadline} />
                : <p className="text-body-md text-muted-foreground">Aún no hay hora de regreso.</p>}
            </section>
          </motion.div>
        </WorkspaceBackdrop>
      </div>
    </main>
  )
}
