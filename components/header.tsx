"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, Menu } from "lucide-react"
import { useRole } from "@/lib/hooks"
import { getRouteLabel, MOBILE_NAV_ID } from "@/lib/navigation"
import { WorkspaceContainer } from "@/components/ui/workspace-container"
import { AccountMenu } from "@/components/account-menu"
import { WorkspaceClock } from "@/components/workspace-clock"
import { KanbanAvisos } from "@/components/kanban-avisos"

interface HeaderProps {
  titleHref?: string
  titleHrefLabel?: string
  showMobileSidebar: boolean
  onOpenSidebar: () => void
  showSidebarToggle?: boolean
  fullWidth?: boolean
}

export default function Header({
  titleHref,
  titleHrefLabel,
  showMobileSidebar,
  onOpenSidebar,
  showSidebarToggle = true,
  fullWidth = false,
}: HeaderProps) {
  const pathname = usePathname()
  const { isEvaluador, loading: roleLoading } = useRole()
  const pageLabel = getRouteLabel(pathname)

  return (
    <>
      <header
        className="workspace-header sticky top-0 z-20 h-[var(--workspace-header-height)] shrink-0 bg-card"
      >
        <WorkspaceContainer fullWidth={fullWidth} className="flex h-full items-center gap-2 border-b border-border">
          {showSidebarToggle && (
            <button
              type="button"
              onClick={onOpenSidebar}
              aria-label="Abrir menú de navegación"
              aria-controls={showMobileSidebar ? MOBILE_NAV_ID : undefined}
              aria-expanded={showMobileSidebar}
              className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
          )}

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

          <WorkspaceClock isCompact={isEvaluador && !roleLoading} />

          <KanbanAvisos />

          {isEvaluador && !roleLoading && (
            <div className="shrink-0">
              <AccountMenu variant="header" />
            </div>
          )}
        </WorkspaceContainer>
      </header>
    </>
  )
}
