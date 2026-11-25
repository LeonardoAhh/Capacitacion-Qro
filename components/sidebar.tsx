"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
import { DESKTOP_NAV_ID, MOBILE_NAV_ID, findActiveLeaf, getWorkspaceNavSections, type WorkspaceId } from "@/lib/navigation"
import { WorkspaceBrand } from "@/components/workspace-switcher"
import { AccountMenu } from "@/components/account-menu"
import { IdeaCapture } from "@/components/idea-capture"
import { LinkPendingIcon } from "@/components/ui/link-pending-icon"
import { WorkspaceClock } from "@/components/workspace-clock"
import { KanbanAvisos } from "@/components/kanban-avisos"
import { SIDEBAR_ICON, SIDEBAR_ICON_BOX, SIDEBAR_ROW } from "@/components/sidebar-density"
// Mismo límite que `md`; la visibilidad del panel sigue en CSS.
import { DESKTOP_QUERY } from "@/lib/hooks/useMediaQuery"
import { useRole } from "@/lib/hooks/useRole"
import { confirmUnsavedChanges, hasUnsavedChanges } from "@/lib/unsaved-changes"

const SIDEBAR_COLLAPSED_KEY = "workspace-sidebar-collapsed"

const rowIdle = "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
const rowActive = "border-sidebar-border bg-sidebar-active font-medium text-foreground shadow-(--sidebar-active-shadow)"
const navLinkBase = "flex w-full items-center rounded-md border border-transparent transition-[background-color,border-color,box-shadow,color] duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sidebar-ring"
const tileBase = "min-h-14 gap-3 rounded-md px-3 py-2 text-body-md"
const tileIdle = "border-sidebar-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"

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
}: {
  onClose?: () => void
  workspace: WorkspaceId
}) {
  return (
    <div className="relative mx-3 mb-2 flex h-[var(--workspace-header-height)] shrink-0 items-center border-b border-sidebar-border">
      <WorkspaceBrand workspace={workspace} mobile />
      {onClose && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Cerrar menú"
          className="absolute right-0 text-muted-foreground hover:text-foreground"
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}

/** Fecha, hora y avisos sobre la cuenta (vista sin encabezado). */
function SidebarStatus() {
  return (
    <div className="flex shrink-0 items-center gap-2 px-3 pb-1">
      <span className="min-w-0 flex-1"><WorkspaceClock /></span>
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
  workspace,
}: {
  pathname: string
  /** Al elegir una ruta en el menú móvil: lo cierra. */
  onNavigate?: () => void
  mobile?: boolean
  workspace: WorkspaceId
}) {
  const { canAccess } = useRole()
  const router = useRouter()
  const navigationItems = useMemo(() => {
    const navSections = getWorkspaceNavSections(workspace)
    const toItems = (sections: typeof navSections) => sections.flatMap((section) => {
      const items = section.items.filter((leaf) => canAccess(leaf.href))
      const activeLeaf = findActiveLeaf(items, pathname)
      return items.map((leaf) => ({
        leaf,
        active: leaf.href === activeLeaf?.href,
      }))
    })
    return [
      ...toItems(navSections.filter((section) => section.pinned)),
      ...toItems(navSections.filter((section) => !section.pinned))
        .sort((a, b) => a.leaf.label.localeCompare(b.leaf.label, "es", { sensitivity: "base" })),
    ]
  }, [workspace, canAccess, pathname])

  return (
      <nav
        aria-label="Secciones"
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-2 scrollbar-thin"
      >
        <ul className={mobile ? "grid grid-cols-2 gap-2" : undefined}>
          {navigationItems.map(({ leaf, active }) => {
            const link = (
              <Link
                href={leaf.href}
                // Con una captura sin guardar se confirma antes de salir; el menú móvil
                // solo se cierra si de verdad se navega.
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
                  mobile ? tileBase : SIDEBAR_ROW,
                  active ? rowActive : mobile ? tileIdle : rowIdle,
                )}
              >
                <span
                  className={cn(
                    "grid shrink-0 place-items-center rounded-md",
                    SIDEBAR_ICON_BOX,
                    active ? "text-sidebar-primary" : "text-muted-foreground",
                  )}
                >
                  {/* Si la página tarda, el ícono pasa a spinner: el clic sí entró. */}
                  <LinkPendingIcon icon={leaf.icon} className={SIDEBAR_ICON} />
                </span>
                <span className={mobile ? "line-clamp-2 min-w-0 break-words" : "truncate"}>{leaf.label}</span>
              </Link>
            )

            return (
              <li key={leaf.href}>
                {link}
              </li>
            )
          })}
        </ul>
      </nav>
  )
}

interface SidebarProps {
  showMobileSidebar: boolean
  setShowMobileSidebar: (v: boolean) => void
  /** Escritorio: la barra se oculta por completo; se abre y cierra desde el header. */
  isCollapsed: boolean
  workspace: WorkspaceId
  onWorkspaceChange: (workspace: WorkspaceId) => void
  /** Hora y avisos en la barra, para la vista sin encabezado. */
  showStatus?: boolean
}

export default function Sidebar({
  showMobileSidebar,
  setShowMobileSidebar,
  isCollapsed,
  workspace,
  onWorkspaceChange,
  showStatus = false,
}: SidebarProps) {
  const pathname = usePathname()
  const closeMobile = useCallback(() => setShowMobileSidebar(false), [setShowMobileSidebar])

  return (
    <>
      <Drawer direction="left" shouldScaleBackground={false} open={showMobileSidebar} onOpenChange={setShowMobileSidebar}>
        <DrawerContent
          id={MOBILE_NAV_ID}
          raw
          fullViewport
          showHandle={false}
          // Pantalla completa: los nombres caben enteros y no queda la página cortada detrás.
          className="inset-0 mt-0 w-full rounded-none border-0"
        >
          <div className="safe-top flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
            <DrawerTitle className="sr-only">Menú principal</DrawerTitle>
            <DrawerDescription className="sr-only">
              Navegación entre las secciones de la aplicación
            </DrawerDescription>

            <SidebarBrand onClose={closeMobile} workspace={workspace} />
            <NavTree pathname={pathname} onNavigate={closeMobile} mobile workspace={workspace} />
            {showStatus && <SidebarStatus />}
            <div className="shrink-0 px-3 pb-2">
              <IdeaCapture workspace={workspace} side="top" onNavigate={closeMobile}
                triggerClassName={cn(navLinkBase, SIDEBAR_ROW, rowIdle)} iconBoxClassName={SIDEBAR_ICON_BOX} iconClassName={SIDEBAR_ICON} />
            </div>
            <div className="safe-bottom-content mx-3 shrink-0 border-t border-sidebar-border pt-2">
              <AccountMenu onNavigate={closeMobile} workspace={workspace} onWorkspaceChange={onWorkspaceChange} />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Oculta queda fuera del orden de tabulación y lectores de pantalla (inert). */}
      <aside
        id={DESKTOP_NAV_ID}
        aria-label="Menú principal"
        data-collapsed={isCollapsed}
        inert={isCollapsed}
        className="workspace-sidebar hidden flex-col bg-sidebar text-sidebar-foreground md:flex"
      >
        {/* Ancho fijo por dentro: mientras se anima, el contenido se recorta sin reacomodarse. */}
        <div className="workspace-sidebar-inner">
        {/* Encabezado sin contenedor, misma altura que el header y separado de la navegación con una línea
            del ancho de la lista. El texto se alinea con los iconos de navegación. */}
        <div className="workspace-sidebar-brand mx-3 mb-2 flex h-[var(--workspace-header-height)] shrink-0 items-center border-b border-sidebar-border">
          <WorkspaceBrand workspace={workspace} />
        </div>
        <NavTree pathname={pathname} workspace={workspace} />
        {showStatus && <SidebarStatus />}
        {/* Ideas de mejora: al pie de la navegación, justo antes de la cuenta. */}
        <div className="shrink-0 px-3 pb-2">
          <IdeaCapture workspace={workspace} side="right"
            triggerClassName={cn(navLinkBase, SIDEBAR_ROW, rowIdle)} iconBoxClassName={SIDEBAR_ICON_BOX} iconClassName={SIDEBAR_ICON} />
        </div>
        {/* Cuenta separada de la navegación con la misma línea que la marca; termina a la altura del panel. */}
        <div className="mx-3 shrink-0 border-t border-sidebar-border pt-2">
          <AccountMenu workspace={workspace} onWorkspaceChange={onWorkspaceChange} />
        </div>
        </div>
      </aside>
    </>
  )
}
