"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, GraduationCap, HardHat, LogOut } from "lucide-react"
import { motion } from "framer-motion"
import { AppTransition, APP_TRANSITION_EXIT_MS, useAppReducedMotion } from "@/components/app-transition"
import { Button } from "@/components/ui/button"
import PluckedText from "@/components/ui/PluckedText"
import { WorkspaceBackdrop } from "@/components/workspace-backdrop"
import { WORKSPACE_ACCENT, WorkspacePreview } from "@/components/workspace-preview"
import { useLogout } from "@/components/use-logout"
import { useActiveWorkspace } from "@/lib/hooks/useActiveWorkspace"
import { useRole } from "@/lib/hooks/useRole"
import { loginStyles } from "@/lib/login/presentation"
import { WORKSPACE_OPTIONS, type WorkspaceId } from "@/lib/navigation"
import { homeFor } from "@/lib/constants/roles"
import { cn } from "@/lib/utils"

export function WorkspaceSelection() {
  const router = useRouter()
  const { role, workspaces, loading } = useRole()
  // Roles sin espacio de trabajo (evaluador) van directo a su inicio.
  const sinEspacios = workspaces.length === 0
  const reducedMotion = useAppReducedMotion()
  const { signingOut, logout } = useLogout()
  const [activeWorkspace, setWorkspace] = useActiveWorkspace()
  const [leaving, setLeaving] = useState(false)
  // Marca la vista elegida al tocarla; antes, la del último espacio usado.
  const [chosen, setChosen] = useState<WorkspaceId | null>(null)
  const selected = chosen ?? activeWorkspace

  useEffect(() => {
    if (!loading && sinEspacios) router.replace(homeFor(role))
  }, [loading, role, router, sinEspacios])

  const chooseWorkspace = (workspace: WorkspaceId) => {
    if (leaving || !workspaces.includes(workspace)) return
    setWorkspace(workspace)
    setChosen(workspace)
    // El contenido sale primero; luego entra el workspace.
    setLeaving(true)
    const destination = homeFor(role, workspace)
    window.setTimeout(() => router.replace(destination), reducedMotion ? 0 : APP_TRANSITION_EXIT_MS)
  }

  if (loading || sinEspacios) return <AppTransition message="Preparando tu espacio…" />

  return (
    <main className={`${loginStyles.page} workspace-shell`}>
      <div className="workspace-frame bg-card md:rounded-xl md:border md:border-border">
        <div className={loginStyles.container}>
          {/* Mismo fondo que la pantalla de carga. */}
          <WorkspaceBackdrop>
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
                  className="text-heading-lg text-foreground sm:text-display-2xl">
                  <span aria-hidden="true">
                    <PluckedText text="Elige tu espacio" loop />
                    <PluckedText text="de trabajo." loop />
                  </span>
                </h1>
                <p className="mt-3 text-body-md text-muted-foreground">Toca una vista para ingresar.</p>
                <div className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-4 sm:gap-6">
                  {WORKSPACE_OPTIONS.map((option) => {
                    const Icon = option.id === "safety" ? HardHat : GraduationCap
                    const permitido = workspaces.includes(option.id)
                    const isSelected = selected === option.id
                    return (
                      <motion.button key={option.id} type="button" disabled={leaving || !permitido} onClick={() => chooseWorkspace(option.id)}
                        aria-pressed={isSelected}
                        aria-label={permitido ? option.label : `${option.label}, sin acceso para tu rol`}
                        whileHover={reducedMotion || !permitido ? undefined : { y: -4 }}
                        whileTap={reducedMotion || !permitido ? undefined : { scale: 0.98, y: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 26 }}
                        className="group grid gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:cursor-not-allowed">
                        {/* Solo el mockup: la selección se marca con su sombra y el círculo de abajo. */}
                        <WorkspacePreview icon={Icon} workspace={option.id} className={cn("transition-shadow",
                          isSelected ? "shadow-lg" : "group-hover:shadow-md",
                          !permitido && "opacity-50")} />
                        <span className="flex flex-wrap items-center justify-center gap-2 text-center">
                          <span className={cn("text-label-sm text-foreground", !permitido && "text-muted-foreground")}>{option.label}</span>
                          <span aria-hidden="true" className={cn("grid size-5 place-items-center rounded-full border transition-colors",
                            isSelected ? cn("border-transparent text-card", WORKSPACE_ACCENT[option.id].solid) : "border-border bg-muted")}>
                            {isSelected && <Check className="size-3" />}
                          </span>
                        </span>
                        {!permitido && <span aria-hidden="true" className="-mt-2 text-center text-body-sm text-muted-foreground">¡Te falta magia para entrar aquí.!</span>}
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            </section>
          </WorkspaceBackdrop>
        </div>
      </div>
    </main>
  )
}
