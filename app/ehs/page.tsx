import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import { SafetyHome } from "@/components/content/safety-home/safety-home"

export const metadata: Metadata = {
  title: "Safe Walk",
}

export default function SafetyHomePage() {
  return <Dashboard fullWidth content={<SafetyHome />} />
}
