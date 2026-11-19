import { supabase } from "@/lib/supabase/client"
import { deactivateKanbanPush } from "@/lib/kanban-push"

type ErrorLike = {
  code?: string
  message?: string
}

export function isExpiredJwtError(error: unknown) {
  const value = error as ErrorLike | null
  return value?.code === "PGRST301" || value?.message?.toLowerCase().includes("jwt expired") === true
}

export async function prepareBrowserSession() {
  const { error } = await supabase.auth.getSession()

  if (error) {
    await deactivateKanbanPush().catch(() => undefined)
    await supabase.auth.signOut({ scope: "local" })
  }
}

export async function refreshOrClearBrowserSession() {
  const { error } = await supabase.auth.refreshSession()

  if (error) {
    await deactivateKanbanPush().catch(() => undefined)
    await supabase.auth.signOut({ scope: "local" })
  }
}
