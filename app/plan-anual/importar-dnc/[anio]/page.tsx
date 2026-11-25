import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Dashboard from "@/components/Dashboard"
import { PlanAnualImportarDncPage } from "@/components/content/plan-anual-importar-dnc-page"
import { anioPlan, rutaPlan } from "@/lib/plan-anual-rutas"

export const metadata: Metadata = {
  title: "Importar DNC",
}

export default async function ImportarDncRoute({ params }: { params: Promise<{ anio: string }> }) {
  const anio = anioPlan((await params).anio)
  if (anio === null) notFound()
  return (
    <Dashboard headerTitleHref={rutaPlan(anio)} headerTitleHrefLabel="Volver a Plan Anual"
      content={<PlanAnualImportarDncPage key={anio} anio={anio} />} />
  )
}
