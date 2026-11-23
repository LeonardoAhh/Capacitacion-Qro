import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { PLANTILLA_PATH } from "@/components/content/plantilla-paths"
import { ReglamentoIncumplimientosPage } from "@/components/content/reglamento-incumplimientos-page"

export const metadata: Metadata = {
  title: "Incumplimientos",
}

export default async function IncumplimientosPage({
  params,
}: {
  params: Promise<{ numeroEmpleado: string }>
}) {
  const { numeroEmpleado } = await params

  return (
    <Dashboard
      headerTitleHref={PLANTILLA_PATH}
      headerTitleHrefLabel="Volver a plantilla"
      content={
        <ReglamentoIncumplimientosPage
          key={numeroEmpleado}
          numeroEmpleado={numeroEmpleado}
        />
      }
    />
  )
}
