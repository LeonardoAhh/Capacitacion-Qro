"use client"

import { useRouter } from "next/navigation"
import { useSignOut } from "@/components/signout-overlay"
import { releaseKanbanPush } from "@/lib/kanban-push"
import { LOGIN_PATH } from "@/lib/navigation"
import { notify } from "@/lib/notify"
import { supabase } from "@/lib/supabase/client"
import { confirmUnsavedChanges } from "@/lib/unsaved-changes"

/** Evita que una red colgada bloquee el cierre de sesión local al retirar la suscripción push. */
const PUSH_RELEASE_TIMEOUT_MS = 1200

export function useLogout() {
  const router = useRouter()
  const { signingOut, setSigningOut } = useSignOut()

  const logout = async () => {
    if (signingOut) return

    try {
      if (!(await confirmUnsavedChanges())) return
    } catch (error) {
      console.error("Could not confirm unsaved changes before sign out:", error)
      notify.error("No se pudo confirmar si hay cambios sin guardar. Inténtalo de nuevo.")
      return
    }

    setSigningOut(true)
    try {
      // Deja de enviar a este dispositivo sin borrar el permiso: al volver a entrar se reactiva solo.
      try {
        await Promise.race([
          releaseKanbanPush(),
          new Promise<void>(resolve => window.setTimeout(resolve, PUSH_RELEASE_TIMEOUT_MS)),
        ])
      } catch (error) {
        console.warn("No se pudo retirar la suscripción push al cerrar sesión:", error)
      }
      const { error } = await supabase.auth.signOut({ scope: "local" })
      if (error) {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (session) throw error
        console.error("Local sign out completed with a server revocation error:", error)
        notify.warning("La sesión se cerró, pero no se pudo confirmar con el servidor.")
      }
      try {
        window.sessionStorage.removeItem("plantilla:tab")
      } catch {
        // Ignorar si sessionStorage no está disponible.
      }
      router.replace(LOGIN_PATH)
    } catch (error) {
      console.error("Could not sign out:", error)
      setSigningOut(false)
      notify.error("No se pudo cerrar la sesión. Inténtalo de nuevo.")
    }
  }

  return { signingOut, logout }
}
