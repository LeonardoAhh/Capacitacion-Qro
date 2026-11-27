import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { FormatoTEPage } from "@/components/content/formato-te/formato-te-page"

export const metadata: Metadata = {
  title: "Formato TE",
}

export default function FormatoTERoute() {
  return <Dashboard fillHeight content={<FormatoTEPage />} />
}
