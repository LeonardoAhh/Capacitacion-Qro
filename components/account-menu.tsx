"use client"

import Link from "next/link"
import { ChevronDown, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { SETTINGS_PATH } from "@/lib/navigation"
import { ROLE_LABELS } from "@/lib/constants/roles"
import { cn } from "@/lib/utils"
import { useLogout } from "@/components/use-logout"
import { useTheme } from "@/components/theme-context"
import { THEME_MODE_LABELS } from "@/lib/theme/constants"
import { SIDEBAR_MENU_ITEM, SIDEBAR_MENU_ROW } from "@/components/sidebar-density"

type AccountMenuProps = {
  isCollapsed?: boolean
  onNavigate?: () => void
}

function AccountAvatar({ src, initials, className }: { src?: string | null; initials: string; className?: string }) {
  return (
    <Avatar className={cn("size-8 shrink-0 rounded-full border border-border", className)}>
      <AvatarImage src={src || undefined} alt="" />
      <AvatarFallback className="rounded-full bg-primary text-xs font-medium text-primary-foreground">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

export function AccountMenu({ isCollapsed = false, onNavigate }: AccountMenuProps) {
  const { user } = useUser()
  const { profile } = useProfile(user?.id)
  const { role, isEvaluador, loading: roleLoading } = useRole()
  const { signingOut, logout } = useLogout()
  const { themeMode, setThemeMode } = useTheme()

  const initials = profile
    ? `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase() || "U"
    : user?.email?.[0]?.toUpperCase() ?? "U"
  const displayName = profile?.displayName || user?.email?.split("@")[0] || "Usuario"
  const roleLabel = roleLoading ? null : ROLE_LABELS[role]
  const accountLabel = roleLabel ? `Cuenta de ${displayName}, ${roleLabel}` : `Cuenta de ${displayName}`

  return (
    <>
      {user && <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={accountLabel}
            title={isCollapsed ? accountLabel : undefined}
            className={cn(
              "flex min-h-11 items-center rounded-md text-foreground transition-colors hover:bg-muted data-[state=open]:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isCollapsed ? "w-full justify-center px-0" : "w-full gap-3 px-2.5",
            )}
          >
            <AccountAvatar src={profile?.avatar} initials={initials} />
            {!isCollapsed && (
              <span className="flex min-w-0 flex-1 flex-col text-left">
                <span className="truncate text-label-sm text-foreground">{displayName}</span>
                {roleLabel && <span className="truncate text-body-sm text-muted-foreground">{roleLabel}</span>}
              </span>
            )}
            {!isCollapsed && (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
          </button>
        </DropdownMenuTrigger>

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
