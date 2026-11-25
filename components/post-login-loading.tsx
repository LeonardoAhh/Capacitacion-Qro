"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppTransition, APP_TRANSITION_EXIT_MS, APP_TRANSITION_MIN_MS, useAppReducedMotion } from "@/components/app-transition"
import { useRole } from "@/lib/hooks"
import { supabase } from "@/lib/supabase/client"
import { POST_LOGIN_PATH } from "@/lib/navigation"
import { homeFor, ROLE_POLICIES } from "@/lib/constants/roles"
import { WORKSPACE_SELECTION } from "@/lib/workspace/presentation"

export function PostLoginLoading() {
  const { role, loading: roleLoading } = useRole()
  const router = useRouter()
  const prefersReducedMotion = useAppReducedMotion()

  const [ready, setReady] = useState(false)
  const [accessSaved, setAccessSaved] = useState(false)
  const [exiting, setExiting] = useState(false)

  // Registra el inicio de sesión (Inicio muestra el anterior). Si falla, igual se continúa.
  useEffect(() => {
    void Promise.resolve(supabase.rpc("registrar_acceso")).finally(() => setAccessSaved(true))
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), prefersReducedMotion ? 0 : APP_TRANSITION_MIN_MS)
    return () => window.clearTimeout(timer)
  }, [prefersReducedMotion])

  useEffect(() => {
    if (roleLoading || !ready || !accessSaved) return

    // Al iniciar sesión siempre se elige espacio de trabajo; sin espacios (evaluador), su inicio fijo.
    const destination = ROLE_POLICIES[role].workspaces.length === 0 ? homeFor(role) : POST_LOGIN_PATH
    setExiting(true)

    const timer = window.setTimeout(() => {
      router.replace(destination)
    }, prefersReducedMotion ? 0 : APP_TRANSITION_EXIT_MS)

    return () => window.clearTimeout(timer)
  }, [roleLoading, ready, accessSaved, role, router, prefersReducedMotion])

  const statusLabel = roleLoading
    ? WORKSPACE_SELECTION.postLogin.checkingAccess
    : ready
      ? WORKSPACE_SELECTION.postLogin.redirecting
      : WORKSPACE_SELECTION.postLogin.preparing

  return <AppTransition message={statusLabel} leaving={exiting} />
}
