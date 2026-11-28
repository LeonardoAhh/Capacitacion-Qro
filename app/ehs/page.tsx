import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { SafetyHome } from "@/components/content/safety-home/safety-home"

export const metadata: Metadata = {
  title: "Safe Walk",
  description: "Gestión y seguimiento de hallazgos de Seguridad e Higiene.",
}

export default function SafetyHomePage() {
  return <Dashboard content={<SafetyHome />} />
}
