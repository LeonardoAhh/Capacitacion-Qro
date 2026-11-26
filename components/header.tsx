"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DESKTOP_NAV_ID, getRouteLabel, MOBILE_NAV_ID } from "@/lib/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { confirmUnsavedChanges, hasUnsavedChanges } from "@/lib/unsaved-changes"
import { WorkspaceContainer } from "@/components/ui/workspace-container"
import { KanbanAvisos } from "@/components/kanban-avisos"
import { SidebarToggleIcon } from "@/components/ui/sidebar-toggle-icon"

interface HeaderProps {
  titleHref?: string
  titleHrefLabel?: string
  showMobileSidebar: boolean
  onOpenSidebar: () => void
  /** Escritorio: la barra lateral está oculta por completo. */
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  /** Solo en móvil (menú y título): en escritorio la hora y los avisos van en la barra lateral. */
  mobileOnly?: boolean
  /** Lugar donde la página pone su búsqueda (HeaderSearch), antes de los avisos. */
  searchSlotRef?: (element: HTMLDivElement | null) => void
}

export default function Header({
  titleHref,
  titleHrefLabel,
  showMobileSidebar,
  onOpenSidebar,
  sidebarCollapsed,
  onToggleSidebar,
  mobileOnly = false,
  searchSlotRef,
}: HeaderProps) {
  const sidebarLabel = sidebarCollapsed ? "Mostrar Menú" : "Ocultar Menú"
  const pathname = usePathname()
  const router = useRouter()
  const pageLabel = getRouteLabel(pathname)

  return (
    // Altura y barra de estado: .workspace-header en globals.css.
    // En escritorio el header queda sobre el lienzo, sin fondo ni línea propia (el panel del contenido lo separa);
    // en móvil el documento hace scroll bajo el header, así que conserva un velo translúcido y su línea inferior.
    <header className={cn("workspace-header sticky top-0 z-20 shrink-0 bg-card/80 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none", mobileOnly && "md:hidden")}>
      {/* Ocupa todo el ancho junto a la barra lateral: el ancho máximo solo aplica al contenido del panel. */}
      <WorkspaceContainer fullWidth className="flex h-full items-center gap-2 border-b border-border md:border-b-0">
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
        {/* Escritorio: muestra u oculta la barra lateral, antes del título. */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onToggleSidebar}
                aria-label={sidebarLabel}
                aria-controls={DESKTOP_NAV_ID}
                aria-expanded={!sidebarCollapsed}
                className="-ml-2 hidden shrink-0 text-muted-foreground md:inline-flex"
              >
                <SidebarToggleIcon collapsed={sidebarCollapsed} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{sidebarLabel}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Page title */}
        <div className="flex min-w-0 flex-1 items-center">
          {pageLabel && (
            <h1 className="min-w-0 text-heading-md text-foreground">
              {titleHref ? <Link href={titleHref}
                // Con una captura sin guardar se confirma antes de volver.
                onNavigate={event => {
                  if (!hasUnsavedChanges()) return
                  event.preventDefault()
                  void confirmUnsavedChanges().then(confirmed => { if (confirmed) router.push(titleHref) })
                }}
                aria-label={titleHrefLabel ? `${pageLabel}. ${titleHrefLabel}` : pageLabel} className="inline-flex min-h-(--control-height) max-w-full items-center gap-2 rounded-md pr-2 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{pageLabel}</span>
              </Link> : <span className="block truncate">{pageLabel}</span>}
            </h1>
          )}
        </div>

        <div ref={searchSlotRef} className="flex min-w-0 shrink items-center" />

        {!mobileOnly && <KanbanAvisos />}
      </WorkspaceContainer>
    </header>
  )
}
