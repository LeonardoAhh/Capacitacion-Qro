"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { APP_TRANSITION_EASE, useAppReducedMotion } from "@/components/app-transition"
import LoginForm from "@/components/login-form"
import LoginPromoPanel from "@/components/login-promo-panel"
import { WorkspaceBackdrop } from "@/components/workspace-backdrop"
import { Card } from "@/components/ui/card"
import { LOGIN, loginStyles } from "@/lib/login/presentation"

export default function LoginShell() {
  const [showForm, setShowForm] = useState(false)
  const reducedMotion = useAppReducedMotion()

  return (
    <main className={`${loginStyles.page} workspace-shell`}>
      <div className={loginStyles.frame}>
        <div className={loginStyles.container}>
          <WorkspaceBackdrop>
            <AnimatePresence mode="wait">
              <motion.div
                key={showForm ? "form" : "intro"}
                className="h-full"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: reducedMotion ? 0 : 0.22, ease: APP_TRANSITION_EASE }}
              >
                {showForm ? (
                  <section aria-label={LOGIN.pageTitle} className={loginStyles.formRegion}>
                    <Card className="my-auto w-full max-w-sm p-(--card-padding) transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none has-[form[data-status=success]]:-translate-y-2 has-[form[data-status=success]]:opacity-0">
                      <LoginForm />
                    </Card>
                  </section>
                ) : <LoginPromoPanel onContinue={() => setShowForm(true)} />}
              </motion.div>
            </AnimatePresence>
          </WorkspaceBackdrop>
        </div>
      </div>
    </main>
  )
}
