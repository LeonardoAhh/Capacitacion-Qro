"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { GraduationCap, HardHat, LogOut } from "lucide-react"
import { motion } from "framer-motion"
import { AppTransition, APP_TRANSITION_EXIT_MS, useAppReducedMotion } from "@/components/app-transition"
import { Button } from "@/components/ui/button"
import PluckedText from "@/components/ui/PluckedText"
import { WorkspaceLandscape } from "@/components/WorkspaceLandscape"
import { useLogout } from "@/components/use-logout"
import { useActiveWorkspace } from "@/lib/hooks/useActiveWorkspace"
import { useRole } from "@/lib/hooks/useRole"
import { loginStyles } from "@/lib/login/presentation"
import { WORKSPACE_OPTIONS, type WorkspaceId } from "@/lib/navigation"
import { SAFETY_HOME_PATH, TRAINING_WORKSPACE_PATH } from "@/lib/workspace-paths"
import { cn } from "@/lib/utils"

export function WorkspaceSelection() {
  const router = useRouter()
  const { isEvaluador, loading } = useRole()
  const reducedMotion = useAppReducedMotion()
  const { signingOut, logout } = useLogout()
  const [, setWorkspace] = useActiveWorkspace()
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!loading && isEvaluador) router.replace("/desempeno")
  }, [isEvaluador, loading, router])

  const chooseWorkspace = (workspace: WorkspaceId) => {
    if (leaving) return
    setWorkspace(workspace)
    // El contenido sale primero; luego entra el workspace.
    setLeaving(true)
    const destination = workspace === "safety" ? SAFETY_HOME_PATH : TRAINING_WORKSPACE_PATH
    window.setTimeout(() => router.replace(destination), reducedMotion ? 0 : APP_TRANSITION_EXIT_MS)
  }

  if (loading || isEvaluador) return <AppTransition message="Preparando tu espacio…" />

  return (
    <main className={`${loginStyles.page} workspace-shell`}>
      <div className="workspace-frame bg-card md:rounded-xl md:border md:border-border">
        <div className={loginStyles.container}>
          {/* Estático: sigue el mismo paisaje de la pantalla de carga, sin volver a pintarse. */}
          <WorkspaceLandscape isStatic>
            <Button
              type="button"
              variant="ghost"
              disabled={signingOut || leaving}
              onClick={() => { void logout() }}
              className="surface-enter absolute right-6 top-6 z-20 hidden hover:bg-destructive hover:text-destructive-foreground focus-visible:bg-destructive focus-visible:text-destructive-foreground md:inline-flex"
            >
              <LogOut aria-hidden="true" />
              Cerrar sesión
            </Button>
            <section aria-label="Elegir espacio de trabajo" aria-busy={leaving}
              className="surface-enter flex min-h-dvh w-full items-center justify-center px-6 py-12 text-center sm:h-full sm:min-h-0">
              <div className={cn("w-full max-w-2xl transition-[opacity,transform] duration-300 ease-out",
                leaving && "-translate-y-2 opacity-0")}>
                <h1 id="workspace-intro-title" aria-label="Elige tu espacio de trabajo."
                  className="text-display-lg text-foreground sm:text-display-2xl">
                  <span aria-hidden="true">
                    <PluckedText text="Elige tu espacio" loop />
                    <PluckedText text="de trabajo." loop />
                  </span>
                </h1>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  {WORKSPACE_OPTIONS.map((option) => {
                    const Icon = option.id === "safety" ? HardHat : GraduationCap
                    return (
                      <Button asChild key={option.id} className="w-full justify-between gap-4 px-5 sm:w-60">
                        <motion.button type="button" disabled={leaving} onClick={() => chooseWorkspace(option.id)}
                          whileHover={reducedMotion ? undefined : { y: -2 }}
                          whileTap={reducedMotion ? undefined : { scale: 0.98, y: 0 }}
                          transition={{ type: "spring", stiffness: 400, damping: 26 }}>
                          <span>{option.label}</span>
                          <Icon className="size-4" aria-hidden="true" />
                        </motion.button>
                      </Button>
                    )
                  })}
                </div>
              </div>
            </section>
          </WorkspaceLandscape>
        </div>
      </div>
    </main>
  )
}
