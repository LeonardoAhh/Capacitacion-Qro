"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import Sidebar, { useSidebar } from "@/components/sidebar"
import Header from "@/components/header"
import { useRole } from "@/lib/hooks"
import { homeFor } from "@/lib/constants/roles"
import { WorkspaceContainer } from "@/components/ui/workspace-container"
import { RadiantLines } from "@/components/ui/radiant-lines"
import { useChartPalette } from "@/components/use-chart-palette"
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/useMediaQuery"
import { AppTransition } from "@/components/app-transition"
import { useActiveWorkspace } from "@/lib/hooks/useActiveWorkspace"
import { HOME_PATH, SAFETY_HOME_PATH, WORKSPACE_OPTIONS, type WorkspaceId } from "@/lib/navigation"
import { useWorkspaceSwitch } from "@/components/workspace-switch-overlay"
import { cn } from "@/lib/utils"

interface DashboardProps {
  content?: ReactNode
  headerTitleHref?: string
  headerTitleHrefLabel?: string
  fullWidth?: boolean
  /** Desde lg, el contenido ocupa exactamente el alto del panel (vistas de una sola pantalla, p. ej. calendarios). */
  fillHeight?: boolean
}

export default function Dashboard({ content, headerTitleHref, headerTitleHrefLabel, fullWidth = false, fillHeight = false }: DashboardProps) {
  const {
    showMobileSidebar,
    setShowMobileSidebar,
    openMobileSidebar,
    isSidebarCollapsed,
    toggleSidebar,
  } = useSidebar()

  const pathname = usePathname()
  const router = useRouter()
  const palette = useChartPalette()
  // En escritorio el scroll ocurre en <main>; en móvil, en la ventana (las líneas lo siguen por defecto).
  const mainRef = useRef<HTMLElement>(null)
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const { role, workspaces, canAccess, isEvaluador, loading: roleLoading } = useRole()
  const [storedWorkspace, setWorkspace] = useActiveWorkspace()
  // Un espacio guardado que el rol ya no tiene se cambia por el primero permitido.
  const workspace = storedWorkspace && !workspaces.includes(storedWorkspace)
    ? workspaces[0] ?? storedWorkspace
    : storedWorkspace
  const allowed = canAccess(pathname ?? "")
  const showWorkspaceSwitch = useWorkspaceSwitch()

  const handleWorkspaceChange = (nextWorkspace: WorkspaceId) => {
    if (nextWorkspace === workspace) return
    const targetPath = nextWorkspace === "safety" ? SAFETY_HOME_PATH : HOME_PATH
    // La capa de transición cubre el cambio de barra lateral y de página.
    showWorkspaceSwitch(WORKSPACE_OPTIONS.find(option => option.id === nextWorkspace)?.label ?? "", targetPath)
    setWorkspace(nextWorkspace)
    if (pathname !== targetPath) router.push(targetPath)
  }

  // Cada rol solo abre sus rutas (lib/constants/roles); si escribe otra, va a su inicio.
  useEffect(() => {
    if (roleLoading || allowed) return
    router.replace(homeFor(role, workspace ?? undefined))
  }, [allowed, role, roleLoading, router, workspace])

  // Header y barra lateral se muestran ya con el rol resuelto: no necesitan revisar la carga.
  // El espacio de trabajo solo falta al hidratar; al navegar entre páginas ya está.
  if (roleLoading || !workspace || !allowed) return <AppTransition message="¡Haciendo magia!.." />

  return (
    // La barra de estado la reserva el header en móvil y el contenedor en escritorio (globals.css).
    // Barra lateral y header sobre el lienzo (tarjeta); el contenido va en un panel hundido aparte.
    <div className="workspace-shell bg-card" data-layout="app" data-desktop-header={isEvaluador ? "none" : undefined}>
      {/* Skip link accesible */}
      <a
        href="#main-content"
        className="sr-only transition-colors focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100]
                   focus:rounded-md focus:border focus:border-border focus:bg-card focus:px-4 focus:py-3
                   focus:text-body-md focus:font-medium focus:outline-2 focus:outline-offset-2 focus:outline-ring"
      >
        Saltar al contenido
      </a>

      <div className="workspace-panel">
        <Sidebar
          showMobileSidebar={showMobileSidebar}
          setShowMobileSidebar={setShowMobileSidebar}
          // El evaluador no tiene header en escritorio (sin control para mostrarla): su barra siempre se ve.
          isCollapsed={isSidebarCollapsed && !isEvaluador}
          workspace={workspace}
          onWorkspaceChange={handleWorkspaceChange}
          showStatus={isEvaluador}
        />

        <div className="workspace-frame">
          <Header
            titleHref={headerTitleHref}
            titleHrefLabel={headerTitleHrefLabel}
            showMobileSidebar={showMobileSidebar}
            onOpenSidebar={openMobileSidebar}
            sidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={toggleSidebar}
            mobileOnly={isEvaluador}
          />

          {/* Panel del contenido: en escritorio, hundido (fondo del tema, borde y radio) con las líneas radiales
              detrás; en móvil ocupa toda la pantalla y el fondo queda fijo al viewport. */}
          <div className="workspace-stage relative isolate">
          <RadiantLines colors={palette} starCount={700} displacement={2.5} containerRef={desktop ? mainRef : undefined}
            className="-z-10 bg-transparent max-md:fixed" />
          <main
            ref={mainRef}
            id="main-content"
            className="workspace-main min-w-0 flex-1 safe-right"
          >
            {/* Un solo margen inferior: el del contenido, o el área segura del teléfono si es mayor.
                Sumar ambos dejaba espacio extra y provocaba scroll aunque el contenido cupiera. */}
            <WorkspaceContainer fullWidth={fullWidth} className={cn("pt-(--workspace-content-padding-y) pb-[max(var(--workspace-content-padding-y),env(safe-area-inset-bottom,0px))]", fillHeight && "lg:flex lg:h-full lg:flex-col")}>
              {/* Cada página entra con un desvanecido corto; header y barra lateral no se mueven. */}
              <div className={cn("surface-enter min-w-0 space-y-6", fillHeight && "lg:flex lg:min-h-0 lg:flex-1 lg:flex-col")}>
                {content}
              </div>
            </WorkspaceContainer>
          </main>
          </div>
        </div>
      </div>
    </div>
  )
}
