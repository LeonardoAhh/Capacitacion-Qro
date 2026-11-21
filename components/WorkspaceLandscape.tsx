import type { ReactNode } from "react"
import InkRidges from "@/components/ui/ink-ridges/InkRidges"
import { cn } from "@/lib/utils"

export function WorkspaceLandscape({ children, isStatic = false, className }: { children: ReactNode; isStatic?: boolean; className?: string }) {
  return (
    <InkRidges
      className={cn("min-h-dvh w-full flex-1 bg-card text-foreground sm:min-h-0", className)}
      horizon={0.34}
      drift={0}
      parallax={0}
      scrollDepth={0}
      birds={0}
      glow={0}
      dprCap={1}
      paintIn={isStatic ? 0 : undefined}
    >
      {children}
    </InkRidges>
  )
}
