"use client"

import { RegistrosPorDiaPage } from "@/components/content/registros-por-dia-page"
import { INCUMPLIMIENTOS_CONFIG } from "@/lib/plantilla/registros-por-dia"

/** Ficha de incumplimientos del reglamento; comparte la ficha genérica con Retardos. */
export function ReglamentoIncumplimientosPage({ numeroEmpleado }: { numeroEmpleado: string }) {
  return <RegistrosPorDiaPage config={INCUMPLIMIENTOS_CONFIG} numeroEmpleado={numeroEmpleado} />
}
