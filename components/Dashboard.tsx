"use client"

import type { ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import Sidebar, { useSidebar } from "@/components/sidebar"
import Header from "@/components/header"
import { useRole } from "@/lib/hooks"
import { isEvaluadorAllowedRoute } from "@/lib/hooks/useRole"
import { WorkspaceContainer } from "@/components/ui/workspace-container"


import { AppTransition } from "@/components/app-transition"

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
  const { isEvaluador, loading: roleLoading } = useRole()

  useEffect(() => {
    if (roleLoading || !isEvaluador) return
    if (!isEvaluadorAllowedRoute(pathname ?? '')) {
      router.replace('/desempeno')
    }
  }, [pathname, isEvaluador, roleLoading, router])

  if (roleLoading) return <AppTransition message="Preparando tu espacio…" />

  return (
    <div 
      className="workspace-shell safe-top bg-background"
    >
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
          />
        )}

        <div className="workspace-frame">
          <Header
            titleHref={headerTitleHref}
            titleHrefLabel={headerTitleHrefLabel}
            fullWidth={fullWidth}
            showMobileSidebar={showMobileSidebar}
            onOpenSidebar={openMobileSidebar}
            showSidebarToggle={!isEvaluador}
          />

          <main
            id="main-content"
            className="min-w-0 flex-1 safe-right safe-bottom-content"
          >
            <WorkspaceContainer fullWidth={fullWidth} className="py-5 sm:py-6 lg:py-8">
              <div className="min-w-0 space-y-6">
                {content}
              </div>
            </WorkspaceContainer>
          </main>
        </div>
      </div>
    </div>
  )
}
