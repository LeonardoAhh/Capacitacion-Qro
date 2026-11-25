import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import PlanAnualContent from "@/components/content/plan-anual-page"
import { anioPlan, mesPlan } from "@/lib/plan-anual-rutas"

export const metadata: Metadata = {
  title: "Plan Anual",
}

/** `?anio=&mes=` abre el plan en ese año y mes (p. ej. al volver de Cursos fijos o Importar DNC). */
export default async function PlanAnualPage({ searchParams }: { searchParams: Promise<{ anio?: string; mes?: string }> }) {
  const { anio, mes } = await searchParams
  return <Dashboard content={<PlanAnualContent initialYear={anioPlan(anio)} initialMonth={mesPlan(mes)} />} />
}
