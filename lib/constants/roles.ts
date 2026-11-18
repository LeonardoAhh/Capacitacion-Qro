import type { AppRole } from "@/lib/hooks/useRole"

// Etiquetas visibles de cada rol (menú de cuenta).
export const ROLE_LABELS: Record<AppRole, string> = {
  dev: "Desarrollador",
  admin: "Administrador",
  evaluador: "Evaluador",
}
