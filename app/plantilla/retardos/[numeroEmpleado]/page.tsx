import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
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
      headerTitleHref="/plantilla"
      headerTitleHrefLabel="Volver a plantilla"
      content={<RetardosPage key={numeroEmpleado} numeroEmpleado={numeroEmpleado} />}
    />
  )
}
