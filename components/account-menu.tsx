"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronDown, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useProfile, useRole, useUser } from "@/lib/hooks"
import { LOGIN_PATH, SETTINGS_PATH } from "@/lib/navigation"
import { SYSTEM_CREDIT, SYSTEM_VERSION } from "@/lib/constants/system"
import { ROLE_LABELS } from "@/lib/constants/roles"
import { supabase } from "@/lib/supabase/client"
import { confirmUnsavedChanges } from "@/lib/unsaved-changes"
import { cn } from "@/lib/utils"
import { useSignOut } from "@/components/signout-overlay"
import { useTheme } from "@/components/theme-context"
import type { ThemeMode } from "@/lib/theme/constants"

type AccountMenuProps = {
  variant: "header" | "sidebar"
  isCollapsed?: boolean
  onNavigate?: () => void
}

const accountMenuItemClass = "min-h-11 gap-2.5 px-2 text-sm font-normal"
const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  light: "Claro",
  dark: "Oscuro",
  system: "Automático",
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

export function AccountMenu({ variant, isCollapsed = false, onNavigate }: AccountMenuProps) {
  const router = useRouter()
  const { user } = useUser()
  const { profile } = useProfile(user?.id)
  const { role, isEvaluador, loading: roleLoading } = useRole()
  const { signingOut, setSigningOut } = useSignOut()
  const { themeMode, setThemeMode } = useTheme()

  const initials = profile
    ? `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase() || "U"
    : user?.email?.[0]?.toUpperCase() ?? "U"
  const displayName = profile?.displayName || user?.email?.split("@")[0] || "Usuario"
  const sidebar = variant === "sidebar"
  const roleLabel = roleLoading ? null : ROLE_LABELS[role]
  const accountLabel = roleLabel ? `Cuenta de ${displayName}, ${roleLabel}` : `Cuenta de ${displayName}`

  const handleLogout = async () => {
    if (signingOut) return

    try {
      if (!(await confirmUnsavedChanges())) return
    } catch (error) {
      console.error("Could not confirm unsaved changes before sign out:", error)
      toast.error("No se pudo confirmar si hay cambios sin guardar. Inténtalo de nuevo.")
      return
    }

    setSigningOut(true)
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" })
      if (error) {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (session) throw error
        console.error("Local sign out completed with a server revocation error:", error)
        toast.warning("La sesión se cerró, pero no se pudo confirmar con el servidor.")
      }
      router.replace(LOGIN_PATH)
    } catch (error) {
      console.error("Could not sign out:", error)
      setSigningOut(false)
      toast.error("No se pudo cerrar la sesión. Inténtalo de nuevo.")
    }
  }

  return (
    <>
      {user && <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={accountLabel}
            title={sidebar && isCollapsed ? accountLabel : undefined}
            className={cn(
              "flex min-h-11 items-center rounded-md text-foreground transition-colors hover:bg-muted data-[state=open]:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              sidebar
                ? isCollapsed
                  ? "w-full justify-center px-0"
                  : "w-full gap-3 px-2.5"
                : "max-w-full gap-2 px-2",
            )}
          >
            <AccountAvatar src={profile?.avatar} initials={initials} />
            {(!sidebar || !isCollapsed) && (
              <span className={cn("min-w-0 flex-col text-left", sidebar ? "flex flex-1" : "hidden max-w-32 sm:flex")}>
                <span className="truncate text-label-sm text-foreground">{displayName}</span>
                {roleLabel && <span className="truncate text-body-sm text-muted-foreground">{roleLabel}</span>}
              </span>
            )}
            {(!sidebar || !isCollapsed) && (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={sidebar && !isCollapsed ? "start" : "end"}
          side={sidebar ? (isCollapsed ? "right" : "top") : "bottom"}
          sideOffset={8}
          className={cn(
            "max-w-[calc(100vw-2rem)]",
            sidebar ? "w-[calc(var(--workspace-sidebar-width)-1rem)]" : "w-max",
          )}
        >
          {!roleLoading && !isEvaluador && (
            <>
              <DropdownMenuItem asChild className={accountMenuItemClass}>
                <Link href={SETTINGS_PATH} onClick={onNavigate}>
                  <Settings className="text-muted-foreground" aria-hidden="true" />
                  Configuración
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={accountMenuItemClass}>
              {themeMode === "light"
                ? <Sun className="text-muted-foreground" aria-hidden="true" />
                : themeMode === "dark"
                  ? <Moon className="text-muted-foreground" aria-hidden="true" />
                  : <Monitor className="text-muted-foreground" aria-hidden="true" />}
              Tema: {THEME_MODE_LABELS[themeMode]}
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
                <DropdownMenuRadioItem value="light">Claro</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">Oscuro</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">Automatico</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={cn(accountMenuItemClass, "text-destructive focus:bg-destructive/10 focus:text-destructive")}
            disabled={signingOut}
            onSelect={() => { void handleLogout() }}
          >
            <LogOut aria-hidden="true" />
            Cerrar sesión
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-body-sm font-normal text-muted-foreground">
            <span>Versión <span className="tabular-nums text-foreground">{SYSTEM_VERSION}</span></span>
            <span>Designed by <span className="font-medium text-foreground">{SYSTEM_CREDIT}</span></span>
          </DropdownMenuLabel>
        </DropdownMenuContent>
      </DropdownMenu>}
    </>
  )
}
