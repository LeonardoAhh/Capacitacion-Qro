import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { PLANTILLA_PATH } from "@/components/content/plantilla-paths"
import { RegistrosPorDiaPage } from "@/components/content/registros-por-dia-page"
import { OMISIONES_MARCAJE_CONFIG } from "@/lib/plantilla/registros-por-dia"

export const metadata: Metadata = {
  title: "Omisión de marcajes",
}

export default async function OmisionesMarcajeRoute({
  params,
}: {
  params: Promise<{ numeroEmpleado: string }>
}) {
  const { numeroEmpleado } = await params

  return (
    <Dashboard
      headerTitleHref={PLANTILLA_PATH}
      headerTitleHrefLabel="Volver a plantilla"
      content={<RegistrosPorDiaPage key={numeroEmpleado} config={OMISIONES_MARCAJE_CONFIG} numeroEmpleado={numeroEmpleado} />}
    />
  )
}
