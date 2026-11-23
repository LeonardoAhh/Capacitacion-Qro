import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import DesempenoCumplimientoContent from "@/components/content/desempeno-cumplimiento"

export const metadata: Metadata = {
  title: "Cumplimiento Evaluaciones",
}

export default function CumplimientoPage() {
  return (
    <Dashboard
      content={<DesempenoCumplimientoContent />}
    />
  )
}
