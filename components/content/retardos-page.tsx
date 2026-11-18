"use client"

import { RegistrosPorDiaPage } from "@/components/content/registros-por-dia-page"
import { RETARDOS_CONFIG } from "@/lib/plantilla/registros-por-dia"

/** Ficha de retardos por empleado; misma captura que Incumplimientos. */
export function RetardosPage({ numeroEmpleado }: { numeroEmpleado: string }) {
  return <RegistrosPorDiaPage config={RETARDOS_CONFIG} numeroEmpleado={numeroEmpleado} />
}
