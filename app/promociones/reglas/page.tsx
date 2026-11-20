import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import ReglasPromocionContent from "@/components/content/reglas-promocion"

export const metadata: Metadata = {
  title: "Reglas de promoción",
}

export default function ReglasPromocionPage() {
  return (
    <Dashboard
      headerTitleHref="/promociones"
      headerTitleHrefLabel="Volver a Categorías"
      content={<ReglasPromocionContent />}
    />
  )
}
