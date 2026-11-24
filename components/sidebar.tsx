"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { PanelLeft, PanelLeftDashed, X } from "lucide-react"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
import { MOBILE_NAV_ID, findActiveLeaf, getWorkspaceNavSections, type WorkspaceId } from "@/lib/navigation"
import { WorkspaceBrand } from "@/components/workspace-switcher"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AccountMenu } from "@/components/account-menu"
import { WorkspaceClock } from "@/components/workspace-clock"
import { KanbanAvisos } from "@/components/kanban-avisos"
import { SIDEBAR_ICON, SIDEBAR_ICON_BOX, SIDEBAR_ROW } from "@/components/sidebar-density"
// Mismo límite que `md`; la visibilidad del panel sigue en CSS.
import { DESKTOP_QUERY } from "@/lib/hooks/useMediaQuery"
import { useRole } from "@/lib/hooks/useRole"
import { confirmUnsavedChanges, hasUnsavedChanges } from "@/lib/unsaved-changes"

const SIDEBAR_COLLAPSED_KEY = "workspace-sidebar-collapsed"

// Hover: gris tenue y plano. Seleccionado: "elevado", una tarjeta con borde fino y sombra suave
// sobre la barra, con el ícono en el color primario; así no se confunde con el hover.
const rowIdle = "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
const rowActive = "border-sidebar-border bg-sidebar-active font-medium text-foreground shadow-(--sidebar-active-shadow)"
const navLinkBase = "flex w-full items-center rounded-md border border-transparent transition-[background-color,border-color,box-shadow,color] duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
const controlBase = "flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"

export interface SidebarApi {
  showMobileSidebar: boolean
  openMobileSidebar: () => void
  isSidebarCollapsed: boolean
  toggleSidebar: () => void
  collapseSidebar: () => void
}

export function useSidebar(): SidebarApi & {
  setShowMobileSidebar: (v: boolean) => void
} {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [preferenceLoaded, setPreferenceLoaded] = useState(false)

  const openMobileSidebar = useCallback(() => setShowMobileSidebar(true), [])
  const toggleSidebar = useCallback(() => setIsSidebarCollapsed((collapsed) => !collapsed), [])
  const collapseSidebar = useCallback(() => setIsSidebarCollapsed(true), [])

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
    collapseSidebar,
  }
}

function SidebarBrand({
  onClose,
  workspace,
}: {
  onClose?: () => void
  workspace: WorkspaceId
}) {
  return (
    <div className="relative flex h-[var(--workspace-header-height)] shrink-0 items-center px-3">
      <WorkspaceBrand workspace={workspace} mobile />
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

/** Fecha, hora y avisos sobre la cuenta (vista sin encabezado). Contraída, solo la campana. */
function SidebarStatus({ isCollapsed = false }: { isCollapsed?: boolean }) {
  return (
    <div className={cn("flex shrink-0 items-center gap-2 px-3 pb-1", isCollapsed && "justify-center px-2")}>
      {!isCollapsed && <span className="min-w-0 flex-1"><WorkspaceClock /></span>}
      <KanbanAvisos />
    </div>
  )
}

/**
 * Full navigation tree shared by the desktop panel and mobile drawer.
 * Cada rol ve solo las rutas que puede abrir (el evaluador, Evaluar y Pendientes).
 */
function NavTree({
  pathname,
  onNavigate,
  mobile = false,
  isCollapsed = false,
  workspace,
}: {
  pathname: string
  /** Al elegir una ruta: cierra el menú móvil o contrae la barra de escritorio. */
  onNavigate?: () => void
  mobile?: boolean
  isCollapsed?: boolean
  workspace: WorkspaceId
}) {
  const navSections = getWorkspaceNavSections(workspace)
  // Secciones fijas (pinned) primero y en su orden declarado; el resto, alfabético.
  const { canAccess } = useRole()
  const router = useRouter()
  // Cada rol solo ve las secciones que puede abrir (lib/constants/roles).
  const toItems = (sections: typeof navSections) => sections.flatMap((section) => {
    const items = section.items.filter((leaf) => canAccess(leaf.href))
    const activeLeaf = findActiveLeaf(items, pathname)
    return items.map((leaf) => ({
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
        id={!mobile ? "workspace-desktop-navigation" : undefined}
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
                // Con una captura sin guardar se confirma antes de salir; cerrar o contraer
                // la barra solo ocurre si de verdad se navega.
                onNavigate={event => {
                  if (!hasUnsavedChanges()) return onNavigate?.()
                  event.preventDefault()
                  void confirmUnsavedChanges().then(confirmed => {
                    if (!confirmed) return
                    onNavigate?.()
                    router.push(leaf.href)
                  })
                }}
                aria-current={active ? "page" : undefined}
                className={cn(
                  navLinkBase,
                  SIDEBAR_ROW,
                  isCollapsed && "justify-center md:px-0",
                  active ? rowActive : rowIdle,
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
                {isCollapsed && !mobile ? (
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
  /** Tras navegar desde la barra de escritorio, se contrae para dejar espacio al contenido. */
  onCollapse: () => void
  workspace: WorkspaceId
  onWorkspaceChange: (workspace: WorkspaceId) => void
  /** Hora y avisos en la barra, para la vista sin encabezado. */
  showStatus?: boolean
}

export default function Sidebar({
  showMobileSidebar,
  setShowMobileSidebar,
  isCollapsed,
  onToggleCollapse,
  onCollapse,
  workspace,
  onWorkspaceChange,
  showStatus = false,
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

            <SidebarBrand onClose={closeMobile} workspace={workspace} />
            <NavTree pathname={pathname} onNavigate={closeMobile} mobile workspace={workspace} />
            {showStatus && <SidebarStatus />}
            <div className="safe-bottom-content shrink-0 px-3 py-2">
              <AccountMenu onNavigate={closeMobile} workspace={workspace} onWorkspaceChange={onWorkspaceChange} />
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
        {/* Sin title nativo: los controles de solo ícono usan el Tooltip de la app. */}
        <TooltipProvider delayDuration={300}>
          {/* Encabezado sin contenedor; misma altura que el header. El texto se alinea con los iconos de navegación. */}
          <div className={cn(
            "mt-2 mb-1 flex h-[var(--workspace-header-height)] shrink-0 items-center",
            isCollapsed ? "justify-center px-2" : "px-2",
          )}>
            <WorkspaceBrand workspace={workspace} collapsed={isCollapsed} />
          </div>
          <NavTree pathname={pathname} onNavigate={isCollapsed ? undefined : onCollapse} isCollapsed={isCollapsed} workspace={workspace} />
          {showStatus && <SidebarStatus isCollapsed={isCollapsed} />}
          <div className={cn(
            "shrink-0 pb-2",
            isCollapsed ? "px-2" : "flex items-center gap-1 px-2",
          )}>
            <AccountMenu isCollapsed={isCollapsed} workspace={workspace} onWorkspaceChange={onWorkspaceChange} />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  aria-label={isCollapsed ? "Expandir navegación" : "Contraer navegación"}
                  aria-controls="workspace-desktop-navigation"
                  aria-expanded={!isCollapsed}
                  className={cn(controlBase, isCollapsed ? "mt-1 w-full md:h-8" : "md:size-8")}
                >
                  {isCollapsed
                    ? <PanelLeft className="size-4" aria-hidden="true" />
                    : <PanelLeftDashed className="size-4" aria-hidden="true" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side={isCollapsed ? "right" : "top"}>
                {isCollapsed ? "Expandir navegación" : "Contraer navegación"}
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </aside>
    </>
  )
}
