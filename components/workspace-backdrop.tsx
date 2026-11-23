import type { ReactNode } from "react"
import { DotPattern } from "@/components/ui/dot-pattern"
import { cn } from "@/lib/utils"

/**
 * Fondo de las pantallas fuera del workspace (login, carga y selección de espacio):
 * patrón de puntos con los tokens del tema, desvanecido hacia los bordes.
 */
export function WorkspaceBackdrop({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative isolate min-h-dvh w-full flex-1 overflow-hidden bg-card text-foreground sm:min-h-0", className)}>
      <DotPattern className="[mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  )
}
