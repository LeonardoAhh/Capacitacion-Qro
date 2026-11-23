import { redirect } from "next/navigation"
import { SAFETY_HOME_PATH } from "@/lib/workspace-paths"

// Ruta anterior de Safe Walk: los accesos guardados (favoritos, PWA) llegan a /ehs.
export default function LegacySafetyHomePage() {
  redirect(SAFETY_HOME_PATH)
}
