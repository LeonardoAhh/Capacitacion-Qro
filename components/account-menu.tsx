"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronRight, ChevronsUpDown, LogOut } from "lucide-react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useProfile, useRole, useUser } from "@/lib/hooks"
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/useMediaQuery"
import type { WorkspaceId } from "@/lib/navigation"
import { SettingsDialog } from "@/components/settings-dialog"
import { WorkspaceMenuSub } from "@/components/workspace-switcher"
import { ROLE_LABELS } from "@/lib/constants/roles"
import { cn } from "@/lib/utils"
import { IDEAS_PATH } from "@/lib/workspace-paths"
import { useLogout } from "@/components/use-logout"
import { useTheme } from "@/components/theme-context"
import { SIDEBAR_MENU_ROW } from "@/components/sidebar-density"
import { AccountSheet } from "@/components/account-sheet"

// Filas del menú de cuenta: solo texto, el foco cambia el color del texto (no el fondo).
const ITEM = cn(SIDEBAR_MENU_ROW, "gap-2 px-2 text-body-md focus:bg-transparent focus:text-primary data-[state=open]:bg-transparent data-[state=open]:text-primary")
const SEPARADOR = "mx-2 my-0"
const OPCION = cn(SIDEBAR_MENU_ROW, "text-body-md")
// Anillo de foco por dentro: la barra lateral recorta lo que sale de ella (overflow por la animación).
const TRIGGER = "flex min-h-(--control-height) w-full min-w-0 items-center gap-2 rounded-md px-2.5 text-foreground transition-colors duration-150 hover:bg-muted/60 data-[state=open]:bg-muted/60 motion-reduce:transition-none focus-inset"

type AccountMenuProps = {
  onNavigate?: () => void
  workspace: WorkspaceId
  onWorkspaceChange: (workspace: WorkspaceId) => void
}

export function AccountMenu({ onNavigate, workspace, onWorkspaceChange }: AccountMenuProps) {
  const { user } = useUser()
  const { profile } = useProfile(user?.id)
  const { role, isEvaluador, canReviewIdeas, loading: roleLoading } = useRole()
  const { signingOut, logout } = useLogout()
  const { themeMode, setThemeMode } = useTheme()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  // Celular: hoja inferior con todo a la vista; desde md, el desplegable con submenús.
  const desktop = useMediaQuery(DESKTOP_QUERY)

  const displayName = profile?.displayName || user?.email?.split("@")[0] || "Usuario"
  // El puesto describe mejor a la persona; sin puesto capturado se muestra el rol.
  // Se espera al perfil para no mostrar el rol y luego cambiarlo por el puesto.
  const roleLabel = profile && !roleLoading ? profile.puesto || ROLE_LABELS[role] : null
  const accountLabel = roleLabel ? `Cuenta de ${displayName}, ${roleLabel}` : `Cuenta de ${displayName}`
  const showSettings = !roleLoading && !isEvaluador
  // El tema vive en Configuración; el evaluador no la tiene y lo cambia desde este menú.
  const showTheme = !roleLoading && isEvaluador

  // Dos renglones fijos: el texto se recorta y nada se mueve al cargar el puesto.
  const triggerContent = <>
    {/* Foto de perfil o, sin ella, la inicial: único elemento circular permitido (design.md). */}
    <Avatar aria-hidden="true" className="size-8 shrink-0">
      {profile?.avatar && <AvatarImage src={profile.avatar} alt="" className="object-cover" />}
      <AvatarFallback className="bg-primary text-label-sm text-primary-foreground">
        {displayName.charAt(0).toLocaleUpperCase("es-MX")}
      </AvatarFallback>
    </Avatar>
    <span className="flex min-w-0 flex-1 flex-col text-left">
      <span className="truncate text-label-sm text-foreground">{displayName}</span>
      <span className="truncate text-body-sm text-muted-foreground">{roleLabel ?? "\u00A0"}</span>
    </span>
    <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
  </>

  if (user && !desktop) {
    return (
      <>
        <button type="button" aria-label={accountLabel} aria-haspopup="dialog" data-state={sheetOpen ? "open" : "closed"}
          className={TRIGGER} onClick={() => setSheetOpen(true)}>
          {triggerContent}
        </button>
        <AccountSheet open={sheetOpen} onClose={() => setSheetOpen(false)} displayName={displayName} roleLabel={roleLabel}
          workspace={workspace}
          onWorkspaceChange={next => { onWorkspaceChange(next); setSheetOpen(false); onNavigate?.() }}
          showSettings={showSettings} showTheme={showTheme} onSettings={() => { setSheetOpen(false); setSettingsOpen(true) }}
          onNavigate={() => { setSheetOpen(false); onNavigate?.() }}
          signingOut={signingOut} onLogout={() => { setSheetOpen(false); onNavigate?.(); void logout() }} />
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </>
    )
  }

  return (
    <>
      {user && <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={accountLabel} className={TRIGGER}>
            {triggerContent}
          </button>
        </DropdownMenuTrigger>

        {/* Menú limpio: título "Cuenta", filas de texto separadas por líneas y la flecha a la
            derecha; la fila enfocada se marca con el texto en primario, sin relleno. */}
        <DropdownMenuContent
          align="start"
          side="top"
          sideOffset={8}
          className="max-w-[calc(100vw-2rem)] w-[calc(var(--workspace-sidebar-width)-1rem)] px-2"
        >
          <DropdownMenuLabel className="px-2 pb-1 text-eyebrow uppercase text-muted-foreground">Cuenta</DropdownMenuLabel>
          {showSettings && (
            <>
              {/* Abre el modal sin cerrar el menú móvil: el modal vive en este componente. */}
              <DropdownMenuItem className={ITEM} onSelect={() => setSettingsOpen(true)}>
                <span className="flex-1">Configuración</span>
                <ChevronRight className="text-muted-foreground" aria-hidden="true" />
              </DropdownMenuItem>
              <DropdownMenuSeparator className={SEPARADOR} />
            </>
          )}

          {/* La lista de ideas solo la revisa quien tiene canReviewIdeas (dev). */}
          {canReviewIdeas && (
            <>
              <DropdownMenuItem asChild className={ITEM}>
                <Link href={IDEAS_PATH}>
                  <span className="flex-1">Ideas de mejora</span>
                  <ChevronRight className="text-muted-foreground" aria-hidden="true" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className={SEPARADOR} />
            </>
          )}

          <WorkspaceMenuSub workspace={workspace} onWorkspaceChange={onWorkspaceChange} onChanged={onNavigate}
            triggerClassName={ITEM} itemClassName={OPCION} separatorClassName={SEPARADOR} />

          {showTheme && (
            <>
              <DropdownMenuSub>
                {/* Solo el nombre y la flecha del submenú; el modo elegido lleva palomita dentro. */}
                <DropdownMenuSubTrigger className={ITEM}>
                  <span className="flex-1">Tema</span>
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
                    <DropdownMenuRadioItem value="system" className={OPCION}>Sistema</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="light" className={OPCION}>Claro</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark" className={OPCION}>Oscuro</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator className={SEPARADOR} />
            </>
          )}

          <DropdownMenuItem
            className={cn(ITEM, "text-destructive focus:bg-destructive/10 focus:text-destructive")}
            disabled={signingOut}
            onSelect={() => { void logout() }}
          >
            <span className="flex-1">{signingOut ? "Cerrando sesión…" : "Cerrar sesión"}</span>
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>}
      {user && <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />}
    </>
  )
}
