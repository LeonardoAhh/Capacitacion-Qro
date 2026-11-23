import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { ActasSeguimientoPage } from "@/components/content/actas-seguimiento-page"
import { PLANTILLA_PATH } from "@/components/content/plantilla-paths"

export const metadata: Metadata = {
  title: "Actas administrativas",
}

export default async function ActasPage({ params }: { params: Promise<{ numeroEmpleado: string }> }) {
  const { numeroEmpleado } = await params

  return (
    <Dashboard
      headerTitleHref={PLANTILLA_PATH}
      headerTitleHrefLabel="Volver a plantilla"
      content={<ActasSeguimientoPage key={numeroEmpleado} numeroEmpleado={numeroEmpleado} />}
    />
  )
}
