import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { CapMatrizPage } from "@/components/content/cap-matriz-page"

export const metadata: Metadata = {
  title: "Matriz de capacitación",
}

export default async function MatrizCapacitacionRoute({
  params,
}: {
  params: Promise<{ empleadoId: string }>
}) {
  const { empleadoId } = await params

  return (
    <Dashboard
      headerTitleHref="/plantilla"
      headerTitleHrefLabel="Volver a plantilla"
      content={<CapMatrizPage key={empleadoId} empleadoId={empleadoId} />}
    />
  )
}
