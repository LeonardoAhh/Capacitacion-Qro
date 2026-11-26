"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { APP_TRANSITION_EASE, useAppReducedMotion } from "@/components/app-transition"
import LoginForm from "@/components/login-form"
import LoginPromoPanel from "@/components/login-promo-panel"
import { WorkspaceBackdrop } from "@/components/workspace-backdrop"
import { Card } from "@/components/ui/card"
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/useMediaQuery"
import { LOGIN, loginStyles } from "@/lib/login/presentation"

/**
 * Móvil: la presentación y, al tocar Acceder, el formulario en su lugar.
 * Tablet y escritorio: una sola vista, presentación a la izquierda y formulario a la derecha.
 */
export default function LoginShell() {
  const [showForm, setShowForm] = useState(false)
  const reducedMotion = useAppReducedMotion()
  const split = useMediaQuery(DESKTOP_QUERY)
  const motionProps = {
    className: "h-full min-w-0",
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: reducedMotion ? 0 : 0.22, ease: APP_TRANSITION_EASE },
  }

  return (
    <main className={`${loginStyles.page} workspace-shell`}>
      <div className={loginStyles.frame}>
        <div className={loginStyles.container}>
          <WorkspaceBackdrop>
            <div className={loginStyles.split}>
              {/* En móvil una vista a la vez (wait); divididas, las dos conviven. */}
              <AnimatePresence mode={split ? "sync" : "wait"}>
                {(split || !showForm) && (
                  <motion.div key="intro" {...motionProps}>
                    <LoginPromoPanel onContinue={() => setShowForm(true)} />
                  </motion.div>
                )}
                {(split || showForm) && (
                  <motion.div key="form" {...motionProps}>
                    <section aria-label={LOGIN.pageTitle} className={loginStyles.formRegion}>
                      <Card className="my-auto w-full max-w-sm p-(--card-padding) transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none has-[form[data-status=success]]:-translate-y-2 has-[form[data-status=success]]:opacity-0">
                        {/* Divididas, el h1 es la marca; el título del formulario baja a h2. */}
                        <LoginForm titleAs={split ? "h2" : "h1"} />
                      </Card>
                    </section>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </WorkspaceBackdrop>
        </div>
      </div>
    </main>
  )
}
