"use client"

import Link from "next/link"
import { ChevronDown, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react"
import type { ReactNode } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useProfile, useRole, useUser } from "@/lib/hooks"
import { SETTINGS_PATH, type WorkspaceId } from "@/lib/navigation"
import { WorkspaceMenuSub } from "@/components/workspace-switcher"
import { ROLE_LABELS } from "@/lib/constants/roles"
import { cn } from "@/lib/utils"
import { useLogout } from "@/components/use-logout"
import { useTheme } from "@/components/theme-context"
import { THEME_MODE_LABELS } from "@/lib/theme/constants"
import { SIDEBAR_MENU_ITEM, SIDEBAR_MENU_ROW } from "@/components/sidebar-density"

type AccountMenuProps = {
  isCollapsed?: boolean
  onNavigate?: () => void
  workspace: WorkspaceId
  onWorkspaceChange: (workspace: WorkspaceId) => void
}

/** Barra contraída: nombre y puesto en el Tooltip de la app (sin title nativo). */
function AccountTooltip({ label, children }: { label: string | null; children: ReactNode }) {
  if (!label) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

export function AccountMenu({ isCollapsed = false, onNavigate, workspace, onWorkspaceChange }: AccountMenuProps) {
  const { user } = useUser()
  const { profile } = useProfile(user?.id)
  const { role, isEvaluador, loading: roleLoading } = useRole()
  const { signingOut, logout } = useLogout()
  const { themeMode, setThemeMode } = useTheme()

  const displayName = profile?.displayName || user?.email?.split("@")[0] || "Usuario"
  const initial = displayName.trim().charAt(0).toUpperCase()
  // El puesto describe mejor a la persona; sin puesto capturado se muestra el rol.
  // Se espera al perfil para no mostrar el rol y luego cambiarlo por el puesto.
  const roleLabel = profile && !roleLoading ? profile.puesto || ROLE_LABELS[role] : null
  const accountLabel = roleLabel ? `Cuenta de ${displayName}, ${roleLabel}` : `Cuenta de ${displayName}`

  return (
    <>
      {user && <DropdownMenu>
        <AccountTooltip label={isCollapsed ? accountLabel : null}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={accountLabel}
              className={cn(
                "flex min-h-11 min-w-0 items-center rounded-md text-foreground transition-colors hover:bg-muted data-[state=open]:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                isCollapsed ? "w-full justify-center px-0" : "w-full gap-2 px-2.5",
              )}
            >
              {isCollapsed ? (
                // Barra contraída: foto de perfil o, sin foto, la inicial del nombre.
                <Avatar className="size-7 shrink-0" aria-hidden="true">
                  <AvatarImage src={profile?.avatar || undefined} alt="" />
                  <AvatarFallback className="bg-primary text-body-sm font-medium text-primary-foreground">{initial}</AvatarFallback>
                </Avatar>
              ) : (
                <>
                  {/* Dos renglones fijos: el texto se recorta y nada se mueve al cargar el puesto. */}
                  <span className="flex min-w-0 flex-1 flex-col text-left">
                    <span className="truncate text-label-sm text-foreground">{displayName}</span>
                    <span className="truncate text-body-sm text-muted-foreground">{roleLabel ?? "\u00A0"}</span>
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
        </AccountTooltip>

        <DropdownMenuContent
          align={isCollapsed ? "end" : "start"}
          side={isCollapsed ? "right" : "top"}
          sideOffset={8}
          className="max-w-[calc(100vw-2rem)] w-[calc(var(--workspace-sidebar-width)-1rem)]"
        >
          {!roleLoading && !isEvaluador && (
            <>
              <DropdownMenuItem asChild className={SIDEBAR_MENU_ITEM}>
                <Link href={SETTINGS_PATH} onClick={onNavigate}>
                  <Settings className="text-muted-foreground" aria-hidden="true" />
                  Configuración
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <WorkspaceMenuSub workspace={workspace} onWorkspaceChange={onWorkspaceChange} onChanged={onNavigate} />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={cn(SIDEBAR_MENU_ITEM, "justify-between")}>
              {themeMode === "light"
                ? <Sun className="text-muted-foreground" aria-hidden="true" />
                : themeMode === "dark"
                  ? <Moon className="text-muted-foreground" aria-hidden="true" />
                  : <Monitor className="text-muted-foreground" aria-hidden="true" />}
              <span className="flex-1">Tema</span>
              <span className="text-body-sm text-muted-foreground">{THEME_MODE_LABELS[themeMode]}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent sideOffset={4}>
              <DropdownMenuRadioGroup
                value={themeMode}
                onValueChange={(value) => {
                  if (value === "light" || value === "dark" || value === "system") {
                    setThemeMode(value)
                  }
                }}
              >
                <DropdownMenuRadioItem value="light" className={SIDEBAR_MENU_ROW}>Claro</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark" className={SIDEBAR_MENU_ROW}>Oscuro</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system" className={SIDEBAR_MENU_ROW}>Automático</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem
            className={cn(SIDEBAR_MENU_ITEM, "text-foreground hover:bg-destructive hover:text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground")}
            disabled={signingOut}
            onSelect={() => { void logout() }}
          >
            <LogOut aria-hidden="true" />
            Cerrar sesión
          </DropdownMenuItem>

        </DropdownMenuContent>
      </DropdownMenu>}
    </>
  )
}
