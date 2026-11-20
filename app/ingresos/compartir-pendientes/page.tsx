import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { IngresosSharePage } from "@/components/content/IngresosSharePage"

export const metadata: Metadata = {
  title: "Compartir pendientes",
}

export default function CompartirPendientesPage() {
  return <Dashboard headerTitleHref="/ingresos" headerTitleHrefLabel="Volver a Nuevos Empleados" content={<IngresosSharePage />} />
}
