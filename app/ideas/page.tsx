import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { IdeasPage } from "@/components/content/ideas-page"

export const metadata: Metadata = {
  title: "Ideas de mejora",
}

export default function Page() {
  return <Dashboard content={<IdeasPage />} />
}
