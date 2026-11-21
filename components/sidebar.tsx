"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PanelLeft, PanelLeftDashed, X } from "lucide-react"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
import { MOBILE_NAV_ID, findActiveLeaf, getWorkspaceNavSections, type WorkspaceId } from "@/lib/navigation"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AccountMenu } from "@/components/account-menu"
import { SIDEBAR_ICON, SIDEBAR_ICON_BOX, SIDEBAR_ROW } from "@/components/sidebar-density"
// Mismo límite que `md`; la visibilidad del panel sigue en CSS.
import { DESKTOP_QUERY } from "@/lib/hooks/useMediaQuery"

const SIDEBAR_COLLAPSED_KEY = "workspace-sidebar-collapsed"

// Sobre la superficie compartida: hover neutro y selección con el tinte del tema.
const rowIdle = "text-muted-foreground hover:bg-muted hover:text-foreground"
const rowActiveSolid = "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
const navLinkBase = "flex w-full items-center rounded-md border border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
const controlBase = "flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"

export interface SidebarApi {
  showMobileSidebar: boolean
  openMobileSidebar: () => void
  isSidebarCollapsed: boolean
  toggleSidebar: () => void
}

export function useSidebar(): SidebarApi & {
  setShowMobileSidebar: (v: boolean) => void
} {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [preferenceLoaded, setPreferenceLoaded] = useState(false)

  const openMobileSidebar = useCallback(() => setShowMobileSidebar(true), [])
  const toggleSidebar = useCallback(() => setIsSidebarCollapsed((collapsed) => !collapsed), [])

  useEffect(() => {
    try {
      setIsSidebarCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true")
    } catch (error) {
      console.error("No se pudo leer la preferencia de la barra lateral.", error)
    } finally {
      setPreferenceLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!preferenceLoaded) return

    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isSidebarCollapsed))
    } catch (error) {
      console.error("No se pudo guardar la preferencia de la barra lateral.", error)
    }
  }, [isSidebarCollapsed, preferenceLoaded])

  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_QUERY)
    const closeOnDesktop = () => {
      if (desktop.matches) setShowMobileSidebar(false)
    }
    desktop.addEventListener("change", closeOnDesktop)
    closeOnDesktop()
    return () => desktop.removeEventListener("change", closeOnDesktop)
  }, [])

  return {
    showMobileSidebar,
    setShowMobileSidebar,
    openMobileSidebar,
    isSidebarCollapsed,
    toggleSidebar,
  }
}

function SidebarBrand({
  onClose,
  workspace,
  onWorkspaceChange,
}: {
  onClose?: () => void
  workspace: WorkspaceId
  onWorkspaceChange: (workspace: WorkspaceId) => void
}) {
  return (
    <div className="relative flex h-[var(--workspace-header-height)] shrink-0 items-center px-3">
      <WorkspaceSwitcher
        workspace={workspace}
        onWorkspaceChange={onWorkspaceChange}
        onClose={onClose}
        mobile
      />
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar menú"
          className={cn(controlBase, "absolute right-3")}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

/**
 * Full navigation tree shared by the desktop panel and mobile drawer.
 * Dashboard no monta la barra lateral para evaluadores: aquí no se revisa el rol.
 */
function NavTree({
  pathname,
  onNavigate,
  isCollapsed = false,
  workspace,
}: {
  pathname: string
  onNavigate?: () => void
  isCollapsed?: boolean
  workspace: WorkspaceId
}) {
  const navSections = getWorkspaceNavSections(workspace)
  // Secciones fijas (pinned) primero y en su orden declarado; el resto, alfabético.
  const toItems = (sections: typeof navSections) => sections.flatMap((section) => {
    const activeLeaf = findActiveLeaf(section.items, pathname)
    return section.items.map((leaf) => ({
      leaf,
      active: leaf.href === activeLeaf?.href,
    }))
  })
  const navigationItems = [
    ...toItems(navSections.filter((section) => section.pinned)),
    ...toItems(navSections.filter((section) => !section.pinned))
      .sort((a, b) => a.leaf.label.localeCompare(b.leaf.label, "es", { sensitivity: "base" })),
  ]

  return (
    <TooltipProvider delayDuration={300}>
      <nav
        id={!onNavigate ? "workspace-desktop-navigation" : undefined}
        aria-label="Secciones"
        className={cn(
          "min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-2 scrollbar-thin",
          isCollapsed ? "px-2" : "px-3",
        )}
      >
        <ul>
          {navigationItems.map(({ leaf, active }) => {
            const link = (
              <Link
                href={leaf.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  navLinkBase,
                  SIDEBAR_ROW,
                  isCollapsed && "justify-center md:px-0",
                  active ? rowActiveSolid : rowIdle,
                )}
              >
                <span
                  className={cn(
                    "grid shrink-0 place-items-center rounded-md",
                    SIDEBAR_ICON_BOX,
                    active ? "text-sidebar-primary" : "text-muted-foreground",
                  )}
                >
                  <leaf.icon className={SIDEBAR_ICON} aria-hidden="true" />
                </span>
                <span className={cn("truncate", isCollapsed && "sr-only")}>{leaf.label}</span>
              </Link>
            )

            return (
              <li key={leaf.href}>
                {isCollapsed && !onNavigate ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{leaf.label}</TooltipContent>
                  </Tooltip>
                ) : link}
              </li>
            )
          })}
        </ul>
      </nav>
    </TooltipProvider>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SidebarProps {
  showMobileSidebar: boolean
  setShowMobileSidebar: (v: boolean) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  workspace: WorkspaceId
  onWorkspaceChange: (workspace: WorkspaceId) => void
}

export default function Sidebar({
  showMobileSidebar,
  setShowMobileSidebar,
  isCollapsed,
  onToggleCollapse,
  workspace,
  onWorkspaceChange,
}: SidebarProps) {
  const pathname = usePathname()
  const closeMobile = useCallback(() => setShowMobileSidebar(false), [setShowMobileSidebar])

  return (
    <>
      {/* ── Mobile drawer (focus trap + Escape + scroll lock via Radix/vaul) ── */}
      <Drawer direction="left" shouldScaleBackground={false} open={showMobileSidebar} onOpenChange={setShowMobileSidebar}>
        <DrawerContent
          id={MOBILE_NAV_ID}
          raw
          fullViewport
          showHandle={false}
          className="inset-y-0 left-0 right-auto mt-0 w-[var(--workspace-sidebar-width)] max-w-[calc(100vw-2rem)] rounded-none border-y-0 border-l-0"
        >
          <div className="safe-top flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
            <DrawerTitle className="sr-only">Menú principal</DrawerTitle>
            <DrawerDescription className="sr-only">
              Navegación entre las secciones de la aplicación
            </DrawerDescription>

            <SidebarBrand
              onClose={closeMobile}
              workspace={workspace}
              onWorkspaceChange={onWorkspaceChange}
            />
            <NavTree pathname={pathname} onNavigate={closeMobile} workspace={workspace} />
            <div className="safe-bottom-content shrink-0 px-3 py-2">
              <AccountMenu onNavigate={closeMobile} />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ── Desktop sidebar ── */}
      <aside
        aria-label="Menú principal"
        data-collapsed={isCollapsed}
        className="workspace-sidebar hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex"
      >
        {/* Encabezado sin contenedor; misma altura que el header. El texto se alinea con los iconos de navegación. */}
        <div className={cn(
          "mt-2 mb-1 flex h-[var(--workspace-header-height)] shrink-0 items-center",
          isCollapsed ? "justify-center px-2" : "px-2",
        )}>
          <WorkspaceSwitcher
            workspace={workspace}
            onWorkspaceChange={onWorkspaceChange}
            collapsed={isCollapsed}
          />
        </div>
        <NavTree pathname={pathname} isCollapsed={isCollapsed} workspace={workspace} />
        <div className={cn(
          "shrink-0 pb-2",
          isCollapsed ? "px-2" : "flex items-center gap-1 px-2",
        )}>
          <AccountMenu isCollapsed={isCollapsed} />
          {!isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Contraer navegación"
              aria-controls="workspace-desktop-navigation"
              aria-expanded="true"
              title="Contraer navegación"
              className={cn(controlBase, "md:size-8")}
            >
              <PanelLeftDashed className="size-4" aria-hidden="true" />
            </button>
          )}
          {isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expandir navegación"
              aria-controls="workspace-desktop-navigation"
              aria-expanded="false"
              title="Expandir navegación"
              className={cn(controlBase, "mt-1 w-full md:h-8")}
            >
              <PanelLeft className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
