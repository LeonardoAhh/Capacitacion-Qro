"use client"

import { useState } from "react"
import { ChevronDown, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react"
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
import type { WorkspaceId } from "@/lib/navigation"
import { SettingsDialog } from "@/components/settings-dialog"
import { WorkspaceMenuSub } from "@/components/workspace-switcher"
import { ROLE_LABELS } from "@/lib/constants/roles"
import { cn } from "@/lib/utils"
import { useLogout } from "@/components/use-logout"
import { useTheme } from "@/components/theme-context"
import { THEME_MODE_LABELS } from "@/lib/theme/constants"
import { SIDEBAR_MENU_ITEM, SIDEBAR_MENU_ROW } from "@/components/sidebar-density"

type AccountMenuProps = {
  onNavigate?: () => void
  workspace: WorkspaceId
  onWorkspaceChange: (workspace: WorkspaceId) => void
}

export function AccountMenu({ onNavigate, workspace, onWorkspaceChange }: AccountMenuProps) {
  const { user } = useUser()
  const { profile } = useProfile(user?.id)
  const { role, isEvaluador, loading: roleLoading } = useRole()
  const { signingOut, logout } = useLogout()
  const { themeMode, setThemeMode } = useTheme()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const displayName = profile?.displayName || user?.email?.split("@")[0] || "Usuario"
  // El puesto describe mejor a la persona; sin puesto capturado se muestra el rol.
  // Se espera al perfil para no mostrar el rol y luego cambiarlo por el puesto.
  const roleLabel = profile && !roleLoading ? profile.puesto || ROLE_LABELS[role] : null
  const accountLabel = roleLabel ? `Cuenta de ${displayName}, ${roleLabel}` : `Cuenta de ${displayName}`

  return (
    <>
      {user && <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={accountLabel}
            // Tarjeta elevada, con los mismos tokens que el elemento activo de la barra lateral.
            className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-active px-2.5 text-foreground shadow-(--sidebar-active-shadow) transition-[border-color] duration-150 hover:border-input data-[state=open]:border-input motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {/* Dos renglones fijos: el texto se recorta y nada se mueve al cargar el puesto. */}
            <span className="flex min-w-0 flex-1 flex-col text-left">
              <span className="truncate text-label-sm text-foreground">{displayName}</span>
              <span className="truncate text-body-sm text-muted-foreground">{roleLabel ?? "\u00A0"}</span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          side="top"
          sideOffset={8}
          className="max-w-[calc(100vw-2rem)] w-[calc(var(--workspace-sidebar-width)-1rem)]"
        >
          {!roleLoading && !isEvaluador && (
            <>
              {/* Abre el modal sin cerrar el menú móvil: el modal vive en este componente. */}
              <DropdownMenuItem className={SIDEBAR_MENU_ITEM} onSelect={() => setSettingsOpen(true)}>
                <Settings className="text-muted-foreground" aria-hidden="true" />
                Configuración
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
      {user && <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />}
    </>
  )
}
