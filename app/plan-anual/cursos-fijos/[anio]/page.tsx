import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Dashboard from "@/components/Dashboard"
import { PlanAnualCursosFijosPage } from "@/components/content/plan-anual-cursos-fijos-page"
import { anioPlan, rutaPlan } from "@/lib/plan-anual-rutas"

export const metadata: Metadata = {
  title: "Cursos fijos",
}

export default async function CursosFijosRoute({ params }: { params: Promise<{ anio: string }> }) {
  const anio = anioPlan((await params).anio)
  if (anio === null) notFound()
  return (
    <Dashboard headerTitleHref={rutaPlan(anio)} headerTitleHrefLabel="Volver a Plan Anual"
      content={<PlanAnualCursosFijosPage anio={anio} />} />
  )
}
