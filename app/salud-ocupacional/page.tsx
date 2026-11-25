import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { SaludOcupacionalPage } from "@/components/content/salud-ocupacional/salud-ocupacional-page"

export const metadata: Metadata = {
  title: "Occupational Health",
  description: "Calendario, indicadores y seguimiento de accidentes de Salud Ocupacional.",
}

export default function Page() {
  return <Dashboard fullWidth fillHeight content={<SaludOcupacionalPage />} />
}
