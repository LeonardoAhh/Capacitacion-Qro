import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import PlanAnualContent from "@/components/content/plan-anual-page"

export const metadata: Metadata = {
  title: "Plan Anual",
}

export default function PlanAnualPage() {
  return <Dashboard content={<PlanAnualContent />} />
}
