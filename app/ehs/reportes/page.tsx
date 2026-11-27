import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { ReportesSeguridadPage } from "@/components/content/reportes-seguridad-page"

export const metadata: Metadata = {
  title: "Reports",
  description: "Reportes semanales en PDF de Safe Walk y Occupational Health.",
}

export default function Page() {
  return <Dashboard fillHeight content={<ReportesSeguridadPage />} />
}
