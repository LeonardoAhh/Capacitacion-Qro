import type { LucideIcon } from "lucide-react"
import type { WorkspaceId } from "@/lib/navigation"
import { cn } from "@/lib/utils"

export const WORKSPACE_ACCENT: Record<WorkspaceId, { solid: string; soft: string; second: string }> = {
  training: {
    solid: "bg-chart-2 text-primary-foreground",
    soft: "bg-chart-2/15 text-primary",
    second: "bg-chart-1",
  },
  safety: {
    solid: "bg-chart-3 text-warning-foreground",
    soft: "bg-chart-3/15 text-warning-deep",
    second: "bg-chart-5",
  },
}

export function WorkspacePreview({ icon: Icon, workspace, className }: { icon: LucideIcon; workspace: WorkspaceId; className?: string }) {
  const accent = WORKSPACE_ACCENT[workspace]
  return (
    <div aria-hidden="true" className={cn("flex aspect-[16/9] w-full overflow-hidden rounded-xl border border-border bg-card sm:aspect-[16/10]", className)}>
      <div className="flex w-1/4 flex-col gap-1.5 border-r border-border bg-muted/60 p-2 sm:gap-2 sm:p-3">
        <span className={cn("h-1.5 w-2/3 rounded-sm", accent.solid)} />
        <span className="mt-1 h-1.5 w-full rounded-sm bg-muted-foreground/20" />
        <span className="h-1.5 w-4/5 rounded-sm bg-muted-foreground/20" />
        <span className="h-1.5 w-full rounded-sm bg-muted-foreground/20" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2 sm:gap-3 sm:p-4">
        <div className="flex items-center gap-2">
          <span className={cn("grid size-5 place-items-center rounded-md", accent.soft)}>
            <Icon className="size-3" />
          </span>
          <span className="h-1.5 w-2/5 rounded-sm bg-foreground/70" />
        </div>
        <div className="space-y-1 rounded-md bg-muted/60 p-1.5 sm:space-y-2 sm:p-3">
          <span className="block h-1.5 w-1/2 rounded-sm bg-muted-foreground/20" />
          <span className="block h-1.5 w-full rounded-sm bg-muted-foreground/20">
            <span className={cn("block h-full w-3/4 rounded-sm", accent.solid)} />
          </span>
          <span className="block h-1.5 w-full rounded-sm bg-muted-foreground/20">
            <span className={cn("block h-full w-2/5 rounded-sm", accent.second)} />
          </span>
        </div>
        <span className="h-1.5 w-4/5 rounded-sm bg-muted-foreground/20" />
        <span className="h-1.5 w-1/2 rounded-sm bg-muted-foreground/20" />
      </div>
    </div>
  )
}
