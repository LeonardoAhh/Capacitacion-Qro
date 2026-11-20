import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { PromDetallePage } from "@/components/content/prom-detalle-page"

export const metadata: Metadata = {
  title: "Detalle de promoción",
}

export default async function PromocionDetalleRoute({
  params,
}: {
  params: Promise<{ empleadoId: string }>
}) {
  const { empleadoId } = await params

  return (
    <Dashboard
      headerTitleHref="/promociones"
      headerTitleHrefLabel="Volver a Categorías"
      content={<PromDetallePage key={empleadoId} empleadoId={empleadoId} />}
    />
  )
}
