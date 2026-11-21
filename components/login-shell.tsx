"use client"

import { Suspense, useState } from "react"
import { Loader2 } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { APP_TRANSITION_EASE, useAppReducedMotion } from "@/components/app-transition"
import LoginForm from "@/components/login-form"
import LoginPromoPanel from "@/components/login-promo-panel"
import { WorkspaceLandscape } from "@/components/WorkspaceLandscape"
import { LOGIN, loginStyles } from "@/lib/login/presentation"

export default function LoginShell() {
  const [showForm, setShowForm] = useState(false)
  const reducedMotion = useAppReducedMotion()

  return (
    <main className={`${loginStyles.page} workspace-shell`}>
      <div className="workspace-frame bg-card md:rounded-xl md:border md:border-border">
        <div className={loginStyles.container}>
          {/* Un solo paisaje: al pasar de la bienvenida al formulario solo cambia el contenido. */}
          <WorkspaceLandscape>
            <AnimatePresence mode="wait">
              <motion.div
                key={showForm ? "form" : "intro"}
                className="h-full"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: reducedMotion ? 0 : 0.28, ease: APP_TRANSITION_EASE }}
              >
                {showForm ? (
                  <section aria-label={LOGIN.pageTitle} className={loginStyles.formRegion}>
                    {/* Al entrar, la tarjeta se desvanece antes de pasar a la pantalla de carga. */}
                    <div className="my-auto w-full max-w-sm rounded-xl border border-border bg-card p-6 transition-[opacity,transform] duration-300 ease-out has-[form[data-status=success]]:-translate-y-2 has-[form[data-status=success]]:opacity-0">
                      <Suspense fallback={
                        <div role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                          {LOGIN.loading}
                        </div>
                      }>
                        <LoginForm />
                      </Suspense>
                    </div>
                  </section>
                ) : <LoginPromoPanel onContinue={() => setShowForm(true)} />}
              </motion.div>
            </AnimatePresence>
          </WorkspaceLandscape>
        </div>
      </div>
    </main>
  )
}
