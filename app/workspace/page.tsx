import type { Metadata } from "next"
import { WorkspaceSelection } from "@/components/workspace-selection"

export const metadata: Metadata = {
  title: "Elegir espacio de trabajo",
}

export default function WorkspacePage() {
  return <WorkspaceSelection />
}
