import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import DncContent from "@/components/content/dnc-page"

export const metadata: Metadata = {
  title: "DNC",
}

export default function DncPage() {
  return <Dashboard fullWidth content={<DncContent />} />
}
