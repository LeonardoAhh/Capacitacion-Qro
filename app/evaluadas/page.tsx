import { DESEMPENO } from "@/lib/desempeno/presentation"
import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import DesempenoEvaluadas from "@/components/content/desempeno-evaluadas"

export const metadata: Metadata = {
  title: DESEMPENO.pages.saved.title,
}

export default function DesempenoEvaluadasPage() {
  return (
    <Dashboard
      content={<DesempenoEvaluadas />}
    />
  )
}
