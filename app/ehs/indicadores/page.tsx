import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { SafetyIndicatorsPage } from "@/components/content/safety-indicators-page"

export const metadata: Metadata = {
  title: "Indicators",
  description: "Hallazgos por departamento y accidentes por mes de Seguridad e Higiene.",
}

export default function Page() {
  return <Dashboard content={<SafetyIndicatorsPage />} />
}
