import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { ExamenHojaRespuestasPage } from "@/components/content/examen-hoja-respuestas-page"
import { EXAMENES_HISTORIAL_HREF } from "@/components/content/examenes-tabs"

export const metadata: Metadata = {
  title: "Hoja de respuestas",
}

export default async function ExamenHojaRespuestasRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <Dashboard
      headerTitleHref={EXAMENES_HISTORIAL_HREF}
      headerTitleHrefLabel="Volver al historial de exámenes"
      content={<ExamenHojaRespuestasPage key={id} id={id} />}
    />
  )
}
