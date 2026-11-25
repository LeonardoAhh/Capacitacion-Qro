import type { Metadata } from "next"
import { WorkspaceSelection } from "@/components/workspace-selection"
import { WORKSPACE_SELECTION } from "@/lib/workspace/presentation"

export const metadata: Metadata = {
  title: WORKSPACE_SELECTION.pageTitle,
  description: WORKSPACE_SELECTION.pageDescription,
}

export default function WorkspacePage() {
  return <WorkspaceSelection />
}
