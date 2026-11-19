import type { Metadata } from "next"
import Dashboard from "@/components/Dashboard"
import KanbanContent from "@/components/content/kanban-page"

export const metadata: Metadata = {
  title: "Kanban",
}

export default function KanbanPage() {
  return <Dashboard fullWidth content={<KanbanContent />} />
}
