import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { CapPuestoCursosPage } from "@/components/content/cap-puesto-cursos-page"
import { PLANTILLA_PATH } from "@/components/content/plantilla-paths"

export const metadata: Metadata = {
  title: "Cursos del puesto",
}

export default async function PuestoCursosRoute({
  params,
}: {
  params: Promise<{ puestoId: string }>
}) {
  const { puestoId } = await params

  return (
    <Dashboard
      headerTitleHref={PLANTILLA_PATH}
      headerTitleHrefLabel="Volver a plantilla"
      content={<CapPuestoCursosPage key={puestoId} puestoId={puestoId} />}
    />
  )
}
