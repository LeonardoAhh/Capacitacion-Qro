import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { PLANTILLA_PATH } from "@/components/content/plantilla-paths"
import { CargarCursosPage } from "@/components/content/cargar-cursos-page"

export const metadata: Metadata = {
  title: "Cargar cursos",
}

export default function CargarCursosRoute() {
  return (
    <Dashboard
      headerTitleHref={PLANTILLA_PATH}
      headerTitleHrefLabel="Volver a plantilla"
      content={<CargarCursosPage />}
    />
  )
}
