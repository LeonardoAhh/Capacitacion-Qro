"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
import { DESKTOP_NAV_ID, MAIN_CONTENT_ID, MOBILE_NAV_ID, SIDEBAR_COLLAPSED_ATTR, SIDEBAR_COLLAPSED_KEY, type WorkspaceId } from "@/lib/navigation"
import { WorkspaceBrand } from "@/components/workspace-switcher"
import { AccountMenu } from "@/components/account-menu"
import { IdeaCapture } from "@/components/idea-capture"
import { ChangelogButton } from "@/components/changelog"
import { SidebarAcciones } from "@/components/sidebar-acciones"
import { SidebarNav } from "@/components/sidebar-nav"
import { KanbanAvisos } from "@/components/kanban-avisos"
import { SIDEBAR_ICON, SIDEBAR_ICON_BOX, SIDEBAR_ROW, SIDEBAR_ROW_BASE, SIDEBAR_ROW_IDLE } from "@/components/sidebar-density"
// Mismo límite que `md`; la visibilidad del panel sigue en CSS.
import { DESKTOP_QUERY } from "@/lib/hooks/useMediaQuery"


export interface SidebarApi {
  showMobileSidebar: boolean
  openMobileSidebar: () => void
  isSidebarCollapsed: boolean
  /** Ya se leyó la preferencia guardada: desde aquí abrir y cerrar se anima. */
  isSidebarReady: boolean
  toggleSidebar: () => void
}

/** Margen por si `transitionend` no llega (pestaña en segundo plano, transición cancelada). */
const FREEZE_FALLBACK_MS = 600

/**
 * Mientras la barra cambia de ancho, el contenido del main toma de una vez su ancho final
 * y el panel solo se recorta: se reacomoda una vez y no en cada cuadro de la animación.
 */
function freezeMainDuringToggle() {
  const main = document.getElementById(MAIN_CONTENT_ID)
  const sidebar = document.getElementById(DESKTOP_NAV_ID)
  const inner = sidebar?.firstElementChild
  const root = document.documentElement
  if (!main || !sidebar || !(inner instanceof HTMLElement) || !sidebar.offsetParent) return
  if (root.classList.contains("reduce-motion") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

  const opening = sidebar.dataset.collapsed === "true"
  const finalWidth = main.clientWidth + (opening ? -inner.offsetWidth : inner.offsetWidth)
  main.style.setProperty("--main-frozen-width", `${finalWidth}px`)
  main.dataset.frozen = "true"

  const release = (event?: TransitionEvent) => {
    if (event && (event.target !== sidebar || event.propertyName !== "width")) return
    sidebar.removeEventListener("transitionend", release)
    window.clearTimeout(timer)
    delete main.dataset.frozen
    main.style.removeProperty("--main-frozen-width")
  }
  sidebar.addEventListener("transitionend", release)
  const timer = window.setTimeout(release, FREEZE_FALLBACK_MS)
}

export function useSidebar(): SidebarApi & {
  setShowMobileSidebar: (v: boolean) => void
} {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [preferenceLoaded, setPreferenceLoaded] = useState(false)

  const openMobileSidebar = useCallback(() => setShowMobileSidebar(true), [])
  const toggleSidebar = useCallback(() => {
    freezeMainDuringToggle()
    setIsSidebarCollapsed((collapsed) => !collapsed)
  }, [])

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

    document.documentElement.toggleAttribute(SIDEBAR_COLLAPSED_ATTR, isSidebarCollapsed)
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
    isSidebarReady: preferenceLoaded,
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
interface SidebarProps {
  showMobileSidebar: boolean
  setShowMobileSidebar: (v: boolean) => void
  /** Escritorio: la barra se oculta por completo; se abre y cierra desde el header. */
  isCollapsed: boolean
  /** Hasta que se lee la preferencia, el estado inicial sale del atributo de <html> y no se anima. */
  isReady: boolean
  workspace: WorkspaceId
  onWorkspaceChange: (workspace: WorkspaceId) => void
  /** Campana de avisos junto a Ideas de mejora, para la vista sin encabezado (evaluador). */
  showStatus?: boolean
  /** Novedades del sistema (botón y alternancia con Ideas); el evaluador no las ve. */
  showNovedades?: boolean
}

export default function Sidebar({
  showMobileSidebar,
  setShowMobileSidebar,
  isCollapsed,
  isReady,
  workspace,
  onWorkspaceChange,
  showStatus = false,
  showNovedades = true,
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
            <SidebarNav pathname={pathname} onNavigate={closeMobile} mobile workspace={workspace} />
            <div className="flex shrink-0 items-center gap-2 px-3 pb-2">
              <div className="min-w-0 flex-1">
                <IdeaCapture workspace={workspace} side="top" onNavigate={closeMobile}
                  triggerClassName={cn(SIDEBAR_ROW_BASE, SIDEBAR_ROW, SIDEBAR_ROW_IDLE)} iconBoxClassName={SIDEBAR_ICON_BOX} iconClassName={SIDEBAR_ICON} />
                {showNovedades && (
                  <ChangelogButton onOpen={closeMobile}
                    triggerClassName={cn(SIDEBAR_ROW_BASE, SIDEBAR_ROW, SIDEBAR_ROW_IDLE)} iconBoxClassName={SIDEBAR_ICON_BOX} iconClassName={SIDEBAR_ICON} />
                )}
              </div>
              {showStatus && <KanbanAvisos />}
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
        data-ready={isReady || undefined}
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
        <SidebarNav pathname={pathname} workspace={workspace} />
        {/* Ideas de mejora (alterna con Novedades) y, sin encabezado, la campana: una fila antes de la cuenta. */}
        <div className="flex shrink-0 items-center gap-2 px-3 pb-2">
          <div className="min-w-0 flex-1">
            <SidebarAcciones workspace={workspace} showNovedades={showNovedades}
              triggerClassName={cn(SIDEBAR_ROW_BASE, SIDEBAR_ROW, SIDEBAR_ROW_IDLE)} iconBoxClassName={SIDEBAR_ICON_BOX} iconClassName={SIDEBAR_ICON} />
          </div>
          {showStatus && <KanbanAvisos />}
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
