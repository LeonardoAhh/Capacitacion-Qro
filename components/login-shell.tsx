"use client"

import { Suspense, useState } from "react"
import { Loader2 } from "lucide-react"
import { useAppReducedMotion } from "@/components/app-transition"
import LoginForm from "@/components/login-form"
import LoginPromoPanel from "@/components/login-promo-panel"
import { SonarGrid } from "@/components/ui/sonar-grid"
import { LOGIN, loginStyles } from "@/lib/login/presentation"

export default function LoginShell() {
  const [showForm, setShowForm] = useState(false)
  const reducedMotion = useAppReducedMotion()

  return (
    <main className={`${loginStyles.page} workspace-shell`}>
      <div className="workspace-frame bg-card md:rounded-xl md:border md:border-border">
        <div className={loginStyles.container}>
          <SonarGrid reducedMotion={reducedMotion || showForm} interactive={!showForm}
            className="min-h-dvh w-full flex-1 bg-background sm:min-h-0">
            {showForm ? (
              <section aria-label={LOGIN.pageTitle} className={loginStyles.formRegion}>
                <div className="my-auto w-full max-w-sm rounded-xl border border-border bg-card p-6">
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
          </SonarGrid>
        </div>
      </div>
    </main>
  )
}
