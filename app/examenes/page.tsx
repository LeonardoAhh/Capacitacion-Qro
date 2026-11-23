import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import ExamenesClient from "@/components/content/examenes-client"
import { toExamenesTab } from "@/components/content/examenes-tabs"

export const metadata: Metadata = {
  title: "Exámenes",
}

export default async function ExamenesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams

  return (
    <Dashboard
      content={<ExamenesClient initialTab={toExamenesTab(tab)} />}
    />
  )
}
