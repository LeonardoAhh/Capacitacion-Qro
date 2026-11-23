import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { PLANTILLA_PATH } from "@/components/content/plantilla-paths"
import { RetardosPage } from "@/components/content/retardos-page"

export const metadata: Metadata = {
  title: "Retardos",
}

export default async function RetardosRoute({
  params,
}: {
  params: Promise<{ numeroEmpleado: string }>
}) {
  const { numeroEmpleado } = await params

  return (
    <Dashboard
      headerTitleHref={PLANTILLA_PATH}
      headerTitleHrefLabel="Volver a plantilla"
      content={<RetardosPage key={numeroEmpleado} numeroEmpleado={numeroEmpleado} />}
    />
  )
}
