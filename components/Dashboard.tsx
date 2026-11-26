"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import Sidebar, { useSidebar } from "@/components/sidebar"
import { InstallPrompt } from "@/components/install-prompt"
import { Changelog } from "@/components/changelog"
import Header from "@/components/header"
import { useRole, useUser } from "@/lib/hooks"
import { homeFor } from "@/lib/constants/roles"
import { WorkspaceContainer } from "@/components/ui/workspace-container"
import { RadiantLines } from "@/components/ui/radiant-lines"
import { useChartPalette } from "@/components/use-chart-palette"
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/useMediaQuery"
import { AppTransition } from "@/components/app-transition"
import { useActiveWorkspace } from "@/lib/hooks/useActiveWorkspace"
import { LOGIN_PATH, MAIN_CONTENT_ID, WORKSPACE_OPTIONS, type WorkspaceId } from "@/lib/navigation"
import { useSignOut } from "@/components/signout-overlay"
import { useWorkspaceSwitch } from "@/components/workspace-switch-overlay"
import { HeaderSearchSlot } from "@/components/ui/header-search"
import { notify } from "@/lib/notify"
import { confirmUnsavedChanges } from "@/lib/unsaved-changes"
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
    isSidebarReady,
  } = useSidebar()

  const pathname = usePathname()
  const router = useRouter()
  const palette = useChartPalette()
  // En escritorio el scroll ocurre en <main>; en móvil, en la ventana (las líneas lo siguen por defecto).
  const mainRef = useRef<HTMLElement>(null)
  // Lugar del header para la búsqueda de la página (HeaderSearch).
  const [searchSlot, setSearchSlot] = useState<HTMLDivElement | null>(null)
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const { user, loading: userLoading } = useUser()
  const { signingOut } = useSignOut()
  const { role, workspaces, canAccess, isEvaluador, loading: roleLoading } = useRole()
  const [storedWorkspace, setWorkspace] = useActiveWorkspace()
  // Un espacio guardado que el rol ya no tiene se cambia por el primero permitido.
  const workspace = storedWorkspace && !workspaces.includes(storedWorkspace)
    ? workspaces[0] ?? storedWorkspace
    : storedWorkspace
  const allowed = canAccess(pathname ?? "")
  const showWorkspaceSwitch = useWorkspaceSwitch()

  const handleWorkspaceChange = async (nextWorkspace: WorkspaceId) => {
    if (nextWorkspace === workspace || !workspaces.includes(nextWorkspace)) return
    try {
      if (!(await confirmUnsavedChanges())) return
    } catch (error) {
      console.error("Could not confirm unsaved changes before switching workspace:", error)
      notify.error("No se pudo confirmar si hay cambios sin guardar. Inténtalo de nuevo.")
      return
    }
    const targetPath = homeFor(role, nextWorkspace)
    const label = WORKSPACE_OPTIONS.find(option => option.id === nextWorkspace)?.label ?? ""
    if (pathname !== targetPath) router.prefetch(targetPath)
    // La capa cubre primero la pantalla; el cambio de barra lateral y de ruta ocurre ya tapado.
    showWorkspaceSwitch(label, targetPath, () => {
      setWorkspace(nextWorkspace)
      if (pathname !== targetPath) router.push(targetPath)
    })
  }

  // Cada rol solo abre sus rutas (lib/constants/roles); durante el cierre de sesión no redirige al inicio del rol por defecto.
  useEffect(() => {
    if (roleLoading || userLoading || signingOut) return
    if (!user) {
      router.replace(LOGIN_PATH)
      return
    }
    if (!allowed) {
      router.replace(homeFor(role, workspace ?? undefined))
    }
  }, [allowed, role, roleLoading, router, signingOut, user, userLoading, workspace])

  // Header y barra lateral se muestran ya con el rol resuelto: no necesitan revisar la carga.
  // El espacio de trabajo solo falta al hidratar; al navegar entre páginas ya está.
  if (roleLoading || userLoading || !user || !workspace || !allowed) return <AppTransition message="Cargando espacio de trabajo…" />

  return (
    // La barra de estado la reserva el header en móvil y el contenedor en escritorio (globals.css).
    // Barra lateral y header sobre el lienzo (tarjeta); el contenido va en un panel hundido aparte.
    <div className="workspace-shell bg-card" data-layout="app" data-desktop-header={isEvaluador ? "none" : undefined}>
      {/* Skip link accesible */}
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="sr-only transition-colors focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100]
                   focus:rounded-md focus:border focus:border-border focus:bg-card focus:px-4 focus:py-3
                   focus:text-body-md focus:font-medium focus:outline-2 focus:outline-offset-2 focus:outline-ring"
      >
        Saltar al contenido
      </a>

      {/* Solo dentro del workspace: en el login no se invita a instalar ni se anuncian novedades. */}
      <InstallPrompt waitForChangelog={!isEvaluador} />
      {/* El evaluador no ve las novedades del sistema. */}
      {!isEvaluador && <Changelog />}

      <div className="workspace-panel">
        <Sidebar
          showMobileSidebar={showMobileSidebar}
          setShowMobileSidebar={setShowMobileSidebar}
          // El evaluador no tiene header en escritorio (sin control para mostrarla): su barra siempre se ve.
          isCollapsed={isSidebarCollapsed && !isEvaluador}
          isReady={isSidebarReady}
          workspace={workspace}
          onWorkspaceChange={handleWorkspaceChange}
          showStatus={isEvaluador}
          showNovedades={!isEvaluador}
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
            searchSlotRef={setSearchSlot}
          />

          {/* Panel del contenido: en escritorio, hundido (fondo del tema, borde y radio) con las líneas radiales
              detrás; en móvil ocupa toda la pantalla y el fondo queda fijo al viewport. */}
          <div className="workspace-stage relative isolate">
            <RadiantLines
              colors={palette}
              starCount={260}
              displacement={1.4}
              containerRef={desktop ? mainRef : undefined}
              className="-z-10 bg-transparent opacity-30 dark:opacity-40 max-md:fixed"
            />
            <main
              ref={mainRef}
              id={MAIN_CONTENT_ID}
              tabIndex={-1}
              className="workspace-main min-w-0 flex-1 safe-left safe-right focus:outline-none"
            >
              {/* Un solo margen inferior: el del contenido, o el área segura del teléfono si es mayor. */}
              <WorkspaceContainer
                fullWidth={fullWidth}
                className={cn(
                  "pt-(--workspace-content-padding-y) pb-[max(var(--workspace-content-padding-y),env(safe-area-inset-bottom,0px))]",
                  fillHeight && "lg:flex lg:h-full lg:flex-col",
                )}
              >
                {/* Cada página entra con un desvanecido corto; header y barra lateral no se mueven. */}
                <div className={cn("surface-enter min-w-0 space-y-6 dense:space-y-4", fillHeight && "lg:flex lg:min-h-0 lg:flex-1 lg:flex-col")}>
                  <HeaderSearchSlot.Provider value={searchSlot}>{content}</HeaderSearchSlot.Provider>
                </div>
              </WorkspaceContainer>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
