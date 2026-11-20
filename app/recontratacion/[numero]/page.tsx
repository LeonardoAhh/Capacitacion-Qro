import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { RecontratacionDetallePage } from "@/components/content/recontratacion-detalle-page"

export const metadata: Metadata = {
  title: "Revisión de contrato",
}

export default async function RecontratacionDetalleRoute({
  params,
}: {
  params: Promise<{ numero: string }>
}) {
  const { numero } = await params

  return (
    <Dashboard
      headerTitleHref="/recontratacion"
      headerTitleHrefLabel="Volver a Recontratación"
      content={<RecontratacionDetallePage key={numero} numero={numero} />}
    />
  )
}
