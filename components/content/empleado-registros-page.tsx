"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AlarmClock, CalendarClock, FilePenLine, Fingerprint, HeartPulse, ShieldAlert } from "lucide-react"
import { SectionNavLayout, type SectionNavItem } from "@/components/ui/section-nav-layout"
import { AccidentesEmpleado } from "@/components/content/accidentes-empleado"
import { ActasSeguimientoPage } from "@/components/content/actas-seguimiento-page"
import { IncidenciasPage } from "@/components/content/incidencias-page"
import { RegistrosPorDiaPage } from "@/components/content/registros-por-dia-page"
import type { RegistrosSeccion } from "@/components/content/plantilla-paths"
import { useRole } from "@/lib/hooks/useRole"
import {
  INCUMPLIMIENTOS_CONFIG, OMISIONES_MARCAJE_CONFIG, RETARDOS_CONFIG,
} from "@/lib/plantilla/registros-por-dia"

/** Mismos nombres e íconos que las acciones del empleado en /plantilla. */
const SECCIONES: readonly SectionNavItem<RegistrosSeccion>[] = [
  { id: "incidencias", label: "Incidencias", icon: CalendarClock },
  { id: "actas", label: "Actas administrativas", icon: FilePenLine },
  { id: "incumplimientos", label: "Incumplimiento", icon: ShieldAlert },
  { id: "retardos", label: "Retardos", icon: AlarmClock },
  { id: "omisiones", label: "Omisión de marcajes", icon: Fingerprint },
  // Solo para canViewEmployeeAccidents: trae datos médicos.
  { id: "accidentes", label: "Accidentes", icon: HeartPulse },
]

function Seccion({ seccion, numeroEmpleado }: { seccion: RegistrosSeccion; numeroEmpleado: string }) {
  switch (seccion) {
    case "incidencias": return <IncidenciasPage numeroEmpleado={numeroEmpleado} />
    case "actas": return <ActasSeguimientoPage numeroEmpleado={numeroEmpleado} />
    case "incumplimientos": return <RegistrosPorDiaPage config={INCUMPLIMIENTOS_CONFIG} numeroEmpleado={numeroEmpleado} />
    case "retardos": return <RegistrosPorDiaPage config={RETARDOS_CONFIG} numeroEmpleado={numeroEmpleado} />
    case "omisiones": return <RegistrosPorDiaPage config={OMISIONES_MARCAJE_CONFIG} numeroEmpleado={numeroEmpleado} />
    case "accidentes": return <AccidentesEmpleado numeroEmpleado={numeroEmpleado} />
  }
}

/**
 * Registros de un empleado en una sola página: navegación interna por apartado y cada
 * apartado con su propia captura. El apartado vive en la URL (?seccion=) para que
 * recargar, compartir o volver atrás mantengan el mismo.
 */
export function EmpleadoRegistrosPage({ numeroEmpleado, seccionInicial }: {
  numeroEmpleado: string
  seccionInicial: RegistrosSeccion
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { canViewEmployeeAccidents } = useRole()
  const secciones = SECCIONES.filter(item => item.id !== "accidentes" || canViewEmployeeAccidents)
  const [elegida, setSeccion] = useState(seccionInicial)
  // Un apartado que el rol no puede ver (p. ej. un enlace con ?seccion=accidentes) cae en el primero.
  const seccion = secciones.some(item => item.id === elegida) ? elegida : secciones[0].id

  const cambiar = (next: RegistrosSeccion) => {
    setSeccion(next)
    const query = new URLSearchParams(searchParams.toString())
    query.set("seccion", next)
    router.replace(`${pathname}?${query}`, { scroll: false })
  }

  return (
    <SectionNavLayout label="Registros del empleado" items={secciones} value={seccion} onValueChange={cambiar}>
      <Seccion key={`${numeroEmpleado}-${seccion}`} seccion={seccion} numeroEmpleado={numeroEmpleado} />
    </SectionNavLayout>
  )
}
