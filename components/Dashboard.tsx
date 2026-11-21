"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import Sidebar, { useSidebar } from "@/components/sidebar"
import Header from "@/components/header"
import { useRole } from "@/lib/hooks"
import { homeFor } from "@/lib/constants/roles"
import { WorkspaceContainer } from "@/components/ui/workspace-container"
import { AppTransition } from "@/components/app-transition"
import { useActiveWorkspace } from "@/lib/hooks/useActiveWorkspace"
import { HOME_PATH, SAFETY_HOME_PATH, type WorkspaceId } from "@/lib/navigation"

interface DashboardProps {
  content?: ReactNode
  headerTitleHref?: string
  headerTitleHrefLabel?: string
  fullWidth?: boolean
}

export default function Dashboard({ content, headerTitleHref, headerTitleHrefLabel, fullWidth = false }: DashboardProps) {
  const {
    showMobileSidebar,
    setShowMobileSidebar,
    openMobileSidebar,
    isSidebarCollapsed,
    toggleSidebar,
  } = useSidebar()

  const pathname = usePathname()
  const router = useRouter()
  const { role, isEvaluador, workspaces, canAccess, loading: roleLoading } = useRole()
  const [storedWorkspace, setWorkspace] = useActiveWorkspace()
  // Un espacio guardado que el rol ya no tiene se cambia por el primero permitido.
  const workspace = storedWorkspace && !workspaces.includes(storedWorkspace)
    ? workspaces[0] ?? storedWorkspace
    : storedWorkspace
  const allowed = canAccess(pathname ?? "")

  const handleWorkspaceChange = (nextWorkspace: WorkspaceId) => {
    if (nextWorkspace === workspace) return
    setWorkspace(nextWorkspace)
    const targetPath = nextWorkspace === "safety" ? SAFETY_HOME_PATH : HOME_PATH
    if (pathname !== targetPath) router.push(targetPath)
  }

  // Cada rol solo abre sus rutas (lib/constants/roles); si escribe otra, va a su inicio.
  useEffect(() => {
    if (roleLoading || allowed) return
    router.replace(homeFor(role, workspace ?? undefined))
  }, [allowed, role, roleLoading, router, workspace])

  // Header y barra lateral se muestran ya con el rol resuelto: no necesitan revisar la carga.
  // El espacio de trabajo solo falta al hidratar; al navegar entre páginas ya está.
  if (roleLoading || !workspace || !allowed) return <AppTransition message="Preparando tu espacio…" />

  return (
    // La barra de estado la reserva el header en móvil y el contenedor en escritorio (globals.css).
    <div className="workspace-shell bg-background">
      {/* Skip link accesible */}
      <a
        href="#main-content"
        className="sr-only transition-colors focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100]
                   focus:rounded-md focus:border focus:border-border focus:bg-card focus:px-4 focus:py-3
                   focus:text-sm focus:font-medium focus:outline-2 focus:outline-offset-2 focus:outline-ring"
      >
        Saltar al contenido
      </a>

      <div className="workspace-panel bg-card md:rounded-xl md:border md:border-border">
        {!isEvaluador && (
          <Sidebar
            showMobileSidebar={showMobileSidebar}
            setShowMobileSidebar={setShowMobileSidebar}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebar}
            workspace={workspace}
            onWorkspaceChange={handleWorkspaceChange}
          />
        )}

        <div className="workspace-frame">
          <Header
            titleHref={headerTitleHref}
            titleHrefLabel={headerTitleHrefLabel}
            fullWidth={fullWidth}
            showMobileSidebar={showMobileSidebar}
            onOpenSidebar={openMobileSidebar}
          />

          <main
            id="main-content"
            className="min-w-0 flex-1 safe-right safe-bottom-content"
          >
            <WorkspaceContainer fullWidth={fullWidth} className="py-(--workspace-content-padding-y)">
              {/* Cada página entra con un desvanecido corto; header y barra lateral no se mueven. */}
              <div className="surface-enter min-w-0 space-y-6">
                {content}
              </div>
            </WorkspaceContainer>
          </main>
        </div>
      </div>
    </div>
  )
}
