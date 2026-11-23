import type { LucideIcon } from "lucide-react"
import type { WorkspaceId } from "@/lib/navigation"
import { cn } from "@/lib/utils"

/** Color de cada espacio, tomado de la paleta de gráficas (clases completas para Tailwind). */
export const WORKSPACE_ACCENT: Record<WorkspaceId, { solid: string; soft: string; second: string }> = {
  training: { solid: "bg-chart-2", soft: "bg-chart-2/15 text-chart-2", second: "bg-chart-1" },
  safety: { solid: "bg-chart-3", soft: "bg-chart-3/15 text-chart-3", second: "bg-chart-5" },
}

/**
 * Miniatura decorativa de la app (barra lateral + contenido) para elegir un espacio
 * de trabajo. Solo usa tokens del tema, así que sigue el modo claro u oscuro.
 */
export function WorkspacePreview({ icon: Icon, workspace, className }: { icon: LucideIcon; workspace: WorkspaceId; className?: string }) {
  const accent = WORKSPACE_ACCENT[workspace]
  return (
    <div aria-hidden="true" className={cn("flex aspect-[16/10] w-full overflow-hidden rounded-lg border border-border bg-card", className)}>
      <div className="flex w-1/4 flex-col gap-1.5 border-r border-border bg-muted/60 p-2 sm:gap-2 sm:p-3">
        <span className={cn("h-1.5 w-2/3 rounded-full", accent.solid)} />
        <span className="mt-1 h-1.5 w-full rounded-full bg-muted-foreground/20" />
        <span className="h-1.5 w-4/5 rounded-full bg-muted-foreground/20" />
        <span className="h-1.5 w-full rounded-full bg-muted-foreground/20" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2.5 sm:gap-3 sm:p-4">
        <div className="flex items-center gap-2">
          <span className={cn("grid size-5 place-items-center rounded-full", accent.soft)}>
            <Icon className="size-3" />
          </span>
          <span className="h-1.5 w-2/5 rounded-full bg-foreground/70" />
        </div>
        <div className="space-y-1.5 rounded-md bg-muted/60 p-2 sm:space-y-2 sm:p-3">
          <span className="block h-1.5 w-1/2 rounded-full bg-muted-foreground/20" />
          <span className="block h-1.5 w-full rounded-full bg-muted-foreground/20">
            <span className={cn("block h-full w-3/4 rounded-full", accent.solid)} />
          </span>
          <span className="block h-1.5 w-full rounded-full bg-muted-foreground/20">
            <span className={cn("block h-full w-2/5 rounded-full", accent.second)} />
          </span>
        </div>
        <span className="h-1.5 w-4/5 rounded-full bg-muted-foreground/20" />
        <span className="h-1.5 w-1/2 rounded-full bg-muted-foreground/20" />
      </div>
    </div>
  )
}
