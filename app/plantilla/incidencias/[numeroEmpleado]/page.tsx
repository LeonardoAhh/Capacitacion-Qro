import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { IncidenciasPage } from "@/components/content/incidencias-page"
import { PLANTILLA_PATH } from "@/components/content/plantilla-paths"

export const metadata: Metadata = {
  title: "Incidencias",
}

export default async function IncidenciasPageRoute({
  params,
  searchParams,
}: {
  params: Promise<{ numeroEmpleado: string }>
  searchParams: Promise<{ origen?: string }>
}) {
  const { numeroEmpleado } = await params
  const { origen } = await searchParams

  const desdeIngresos = origen === "ingresos-semanales"

  return (
    <Dashboard
      headerTitleHref={desdeIngresos ? "/ingresos-semanales" : PLANTILLA_PATH}
      headerTitleHrefLabel={desdeIngresos ? "Volver a ingresos semanales" : "Volver a plantilla"}
      content={<IncidenciasPage key={numeroEmpleado} numeroEmpleado={numeroEmpleado} />}
    />
  )
}
