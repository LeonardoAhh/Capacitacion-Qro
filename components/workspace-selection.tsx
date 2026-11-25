"use client"

import { useEffect, useRef, useState } from "react"
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
import { WORKSPACE_SELECTION, workspaceStyles } from "@/lib/workspace/presentation"
import { cn } from "@/lib/utils"

export function WorkspaceSelection() {
  const router = useRouter()
  const { role, workspaces, loading } = useRole()
  const sinEspacios = workspaces.length === 0
  const reducedMotion = useAppReducedMotion()
  const { signingOut, logout } = useLogout()
  const [activeWorkspace, setWorkspace] = useActiveWorkspace()
  const [leaving, setLeaving] = useState(false)
  const [chosen, setChosen] = useState<WorkspaceId | null>(null)
  const navTimerRef = useRef<number | null>(null)
  const selected = chosen ?? activeWorkspace

  useEffect(() => {
    if (!loading && sinEspacios) router.replace(homeFor(role))
  }, [loading, role, router, sinEspacios])

  useEffect(() => {
    return () => {
      if (navTimerRef.current !== null) window.clearTimeout(navTimerRef.current)
    }
  }, [])

  const chooseWorkspace = (workspace: WorkspaceId) => {
    if (leaving || !workspaces.includes(workspace)) return
    setWorkspace(workspace)
    setChosen(workspace)
    setLeaving(true)
    const destination = homeFor(role, workspace)
    navTimerRef.current = window.setTimeout(
      () => router.replace(destination),
      reducedMotion ? 0 : APP_TRANSITION_EXIT_MS
    )
  }

  if (loading || sinEspacios) return <AppTransition message={WORKSPACE_SELECTION.loading} />

  return (
    <main className={`${loginStyles.page} workspace-shell`}>
      <div className={loginStyles.frame}>
        <div className={loginStyles.container}>
          <WorkspaceBackdrop>
            <div className={workspaceStyles.backdropInner}>
              <div className={workspaceStyles.topBar}>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={signingOut || leaving}
                  onClick={() => { void logout() }}
                  className="hover:bg-destructive hover:text-destructive-foreground focus-visible:bg-destructive focus-visible:text-destructive-foreground"
                >
                  <LogOut aria-hidden="true" />
                  <span>{signingOut ? WORKSPACE_SELECTION.loggingOut : WORKSPACE_SELECTION.logout}</span>
                </Button>
              </div>
              <section
                aria-labelledby="workspace-intro-title"
                aria-busy={leaving}
                className={workspaceStyles.region}
              >
                <div className={cn(workspaceStyles.content, leaving && "-translate-y-2 opacity-0")}>
                  <h1 id="workspace-intro-title" className={workspaceStyles.heading}>
                    <PluckedText text={WORKSPACE_SELECTION.heading} />
                  </h1>
                  <p className={workspaceStyles.subtitle}>{WORKSPACE_SELECTION.subtitle}</p>
                  <div className={workspaceStyles.grid}>
                    {WORKSPACE_OPTIONS.map((option) => {
                      const Icon = option.id === "safety" ? HardHat : GraduationCap
                      const permitido = workspaces.includes(option.id)
                      const isSelected = selected === option.id
                      const noteId = `workspace-note-${option.id}`
                      return (
                        <motion.button
                          key={option.id}
                          type="button"
                          disabled={leaving || !permitido}
                          onClick={() => chooseWorkspace(option.id)}
                          aria-pressed={isSelected}
                          aria-describedby={!permitido ? noteId : undefined}
                          whileHover={reducedMotion || !permitido ? undefined : { y: -4 }}
                          whileTap={reducedMotion || !permitido ? undefined : { scale: 0.98, y: 0 }}
                          transition={{ type: "spring", stiffness: 400, damping: 26 }}
                          className={workspaceStyles.optionButton}
                        >
                          <WorkspacePreview
                            icon={Icon}
                            workspace={option.id}
                            className={cn(
                              "transition-[border-color,box-shadow]",
                              isSelected
                                ? "border-primary ring-1 ring-primary shadow-[var(--floating-shadow)]"
                                : !permitido
                                  ? "opacity-50"
                                  : "group-hover:border-foreground/30 group-hover:shadow-[var(--floating-shadow)]"
                            )}
                          />
                          <span
                            aria-hidden="true"
                            className={cn(
                              "absolute -right-2 -top-2 grid size-6 place-items-center rounded-md border-2 border-card transition-colors",
                              isSelected ? WORKSPACE_ACCENT[option.id].solid : "bg-muted"
                            )}
                          >
                            {isSelected && <Check className="size-3.5" />}
                          </span>
                          <span className={cn(workspaceStyles.optionLabel, !permitido && "text-muted-foreground")}>
                            {option.label}
                          </span>
                          {!permitido && (
                            <span id={noteId} className={workspaceStyles.optionNote}>
                              {WORKSPACE_SELECTION.noAccess}
                            </span>
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              </section>
            </div>
          </WorkspaceBackdrop>
        </div>
      </div>
    </main>
  )
}
