"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getRouteLabel, MOBILE_NAV_ID } from "@/lib/navigation"
import { WorkspaceContainer } from "@/components/ui/workspace-container"
import { WorkspaceClock } from "@/components/workspace-clock"
import { KanbanAvisos } from "@/components/kanban-avisos"

interface HeaderProps {
  titleHref?: string
  titleHrefLabel?: string
  showMobileSidebar: boolean
  onOpenSidebar: () => void
  fullWidth?: boolean
  /** Solo en móvil (menú y título): en escritorio la hora y los avisos van en la barra lateral. */
  mobileOnly?: boolean
}

export default function Header({
  titleHref,
  titleHrefLabel,
  showMobileSidebar,
  onOpenSidebar,
  fullWidth = false,
  mobileOnly = false,
}: HeaderProps) {
  const pathname = usePathname()
  const pageLabel = getRouteLabel(pathname)

  return (
    // Altura y barra de estado: .workspace-header en globals.css.
    <header className={cn("workspace-header sticky top-0 z-20 shrink-0 bg-card", mobileOnly && "md:hidden")}>
      <WorkspaceContainer fullWidth={fullWidth} className="flex h-full items-center gap-2 border-b border-border">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenSidebar}
          aria-label="Abrir menú de navegación"
          aria-controls={showMobileSidebar ? MOBILE_NAV_ID : undefined}
          aria-expanded={showMobileSidebar}
          className="shrink-0 text-muted-foreground md:hidden"
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>

        {/* Page title */}
        <div className="flex min-w-0 flex-1 items-center">
          {pageLabel && (
            <h1 className="min-w-0 text-heading-md text-foreground">
              {titleHref ? <Link href={titleHref} aria-label={titleHrefLabel ? `${pageLabel}. ${titleHrefLabel}` : pageLabel} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-md pr-2 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{pageLabel}</span>
              </Link> : <span className="block truncate">{pageLabel}</span>}
            </h1>
          )}
        </div>

        {!mobileOnly && <>
          <WorkspaceClock />
          <KanbanAvisos />
        </>}
      </WorkspaceContainer>
    </header>
  )
}
