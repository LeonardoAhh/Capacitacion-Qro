"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PanelLeft, PanelLeftDashed, X } from "lucide-react"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
import { HOME_PATH, MOBILE_NAV_ID, NAV_SECTIONS, findActiveLeaf } from "@/lib/navigation"
import { AppMark } from "@/components/app-transition"
import { useRole } from "@/lib/hooks/useRole"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AccountMenu } from "@/components/account-menu"
import { APP_NAME, BRAND_NAME } from "@/lib/constants/company"

// Matches Tailwind's `md` boundary; layout visibility itself stays in CSS.
const DESKTOP_QUERY = "(min-width: 48rem)"
const SIDEBAR_COLLAPSED_KEY = "workspace-sidebar-collapsed"

// Sobre la superficie compartida: hover neutro y selección con el tinte del tema.
const rowIdle = "text-muted-foreground hover:bg-muted hover:text-foreground"
const rowActiveSolid = "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
const navLinkBase = "flex min-h-11 w-full items-center rounded-md border border-transparent px-3 text-body-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
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
}: {
  onClose?: () => void
}) {
  return (
    <div className="relative flex h-[var(--workspace-header-height)] shrink-0 items-center px-3">
      <Link
        href={HOME_PATH}
        onClick={onClose}
        aria-label={`${BRAND_NAME}, ir a Inicio`}
        className={cn(
          "flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-sidebar-border bg-card px-2 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring",
          onClose && "mr-11",
        )}
      >
        <AppMark className="size-9 shrink-0" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-label-sm text-foreground">{APP_NAME}</span>
          <span className="truncate text-body-sm text-muted-foreground">{BRAND_NAME}</span>
        </span>
      </Link>
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
 */
function NavTree({
  pathname,
  onNavigate,
  isCollapsed = false,
}: {
  pathname: string
  onNavigate?: () => void
  isCollapsed?: boolean
}) {
  // Secciones fijas (pinned) primero y en su orden declarado; el resto, alfabético.
  const toItems = (sections: typeof NAV_SECTIONS) => sections.flatMap((section) => {
    const activeLeaf = findActiveLeaf(section.items, pathname)
    return section.items.map((leaf) => ({
      leaf,
      active: leaf.href === activeLeaf?.href,
    }))
  })
  const navigationItems = [
    ...toItems(NAV_SECTIONS.filter((section) => section.pinned)),
    ...toItems(NAV_SECTIONS.filter((section) => !section.pinned))
      .sort((a, b) => a.leaf.label.localeCompare(b.leaf.label, "es", { sensitivity: "base" })),
  ]

  return (
    <TooltipProvider delayDuration={300}>
      <nav
        id={!onNavigate ? "workspace-desktop-navigation" : undefined}
        aria-label="Secciones"
        className={cn(
          "min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-4 scrollbar-thin",
          isCollapsed ? "px-2" : "px-3",
        )}
      >
        <ul className="space-y-1 pt-1">
          {navigationItems.map(({ leaf, active }) => {
            const link = (
              <Link
                href={leaf.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  navLinkBase,
                  isCollapsed ? "justify-center px-0" : "gap-3",
                  active ? rowActiveSolid : rowIdle,
                )}
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-md",
                    active ? "text-sidebar-primary" : "text-muted-foreground",
                  )}
                >
                  <leaf.icon className="size-4" aria-hidden="true" />
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
}

export default function Sidebar({
  showMobileSidebar,
  setShowMobileSidebar,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname()
  const { role } = useRole()
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

            <SidebarBrand onClose={closeMobile} />
            <NavTree pathname={pathname} onNavigate={closeMobile} />
            {role !== "evaluador" && (
              <div className="safe-bottom-content shrink-0 px-3 py-2">
                <AccountMenu variant="sidebar" onNavigate={closeMobile} />
              </div>
            )}
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
          "mb-2 flex h-[var(--workspace-header-height)] shrink-0 items-center",
          isCollapsed ? "justify-center px-2" : "justify-between gap-1 pl-6 pr-2",
        )}>
          {!isCollapsed && (
            <span className="flex min-w-0 flex-col" title={`${APP_NAME} · ${BRAND_NAME}`}>
              <span className="truncate text-label-sm text-foreground">{APP_NAME}</span>
              <span className="truncate text-body-sm text-muted-foreground">{BRAND_NAME}</span>
            </span>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expandir navegación" : "Contraer navegación"}
            aria-controls="workspace-desktop-navigation"
            aria-expanded={!isCollapsed}
            title={isCollapsed ? "Expandir navegación" : "Contraer navegación"}
            className={controlBase}
          >
            {isCollapsed
              ? <PanelLeft className="size-5" aria-hidden="true" />
              : <PanelLeftDashed className="size-5" aria-hidden="true" />}
          </button>
        </div>
        <NavTree pathname={pathname} isCollapsed={isCollapsed} />
        {role !== "evaluador" && (
          <div className="shrink-0 px-2 py-2">
            <AccountMenu variant="sidebar" isCollapsed={isCollapsed} />
          </div>
        )}
      </aside>
    </>
  )
}
