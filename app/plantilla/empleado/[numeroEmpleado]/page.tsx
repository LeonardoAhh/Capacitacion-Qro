import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { EmpleadoRegistrosPage } from "@/components/content/empleado-registros-page"
import { isRegistrosSeccion, PLANTILLA_PATH, REGISTROS_SECCIONES } from "@/components/content/plantilla-paths"

export const metadata: Metadata = {
  title: "Registros del empleado",
}

const ORIGEN_INGRESOS = "ingresos-semanales"

export default async function EmpleadoRegistrosRoute({
  params,
  searchParams,
}: {
  params: Promise<{ numeroEmpleado: string }>
  searchParams: Promise<{ seccion?: string; origen?: string }>
}) {
  const { numeroEmpleado } = await params
  const { seccion, origen } = await searchParams
  const desdeIngresos = origen === ORIGEN_INGRESOS

  return (
    <Dashboard
      headerTitleHref={desdeIngresos ? "/ingresos-semanales" : PLANTILLA_PATH}
      headerTitleHrefLabel={desdeIngresos ? "Volver a ingresos semanales" : "Volver a plantilla"}
      content={
        <EmpleadoRegistrosPage
          key={numeroEmpleado}
          numeroEmpleado={numeroEmpleado}
          seccionInicial={isRegistrosSeccion(seccion) ? seccion : REGISTROS_SECCIONES[0]}
        />
      }
    />
  )
}
