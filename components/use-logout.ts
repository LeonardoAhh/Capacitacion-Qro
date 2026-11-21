"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useSignOut } from "@/components/signout-overlay"
import { releaseKanbanPush } from "@/lib/kanban-push"
import { LOGIN_PATH } from "@/lib/navigation"
import { supabase } from "@/lib/supabase/client"
import { confirmUnsavedChanges } from "@/lib/unsaved-changes"

export function useLogout() {
  const router = useRouter()
  const { signingOut, setSigningOut } = useSignOut()

  const logout = async () => {
    if (signingOut) return

    try {
      if (!(await confirmUnsavedChanges())) return
    } catch (error) {
      console.error("Could not confirm unsaved changes before sign out:", error)
      toast.error("No se pudo confirmar si hay cambios sin guardar. Inténtalo de nuevo.")
      return
    }

    setSigningOut(true)
    try {
      // Deja de enviar a este dispositivo sin borrar el permiso: al volver a entrar se reactiva solo.
      try {
        await releaseKanbanPush()
      } catch (error) {
        console.warn("No se pudo retirar la suscripción push al cerrar sesión:", error)
      }
      const { error } = await supabase.auth.signOut({ scope: "local" })
      if (error) {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (session) throw error
        console.error("Local sign out completed with a server revocation error:", error)
        toast.warning("La sesión se cerró, pero no se pudo confirmar con el servidor.")
      }
      router.replace(LOGIN_PATH)
    } catch (error) {
      console.error("Could not sign out:", error)
      setSigningOut(false)
      toast.error("No se pudo cerrar la sesión. Inténtalo de nuevo.")
    }
  }

  return { signingOut, logout }
}
