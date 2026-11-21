"use client"

import { LogOut, Monitor, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useLogout } from "@/components/use-logout"
import { useTheme } from "@/components/theme-context"
import { THEME_MODE_LABELS, type ThemeMode } from "@/lib/theme/constants"

const NEXT_THEME_MODE: Record<ThemeMode, ThemeMode> = {
  light: "dark",
  dark: "system",
  system: "light",
}

export function EvaluatorHeaderActions() {
  const { themeMode, setThemeMode } = useTheme()
  const { signingOut, logout } = useLogout()
  const nextTheme = NEXT_THEME_MODE[themeMode]
  const themeLabel = `Tema: ${THEME_MODE_LABELS[themeMode]}. Cambiar a ${THEME_MODE_LABELS[nextTheme]}`
  const ThemeIcon = themeMode === "light" ? Sun : themeMode === "dark" ? Moon : Monitor

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex shrink-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label={themeLabel} onClick={() => setThemeMode(nextTheme)}>
              <ThemeIcon aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{themeLabel}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Cerrar sesión"
              disabled={signingOut}
              onClick={() => { void logout() }}
              className="hover:bg-destructive hover:text-destructive-foreground focus-visible:bg-destructive focus-visible:text-destructive-foreground"
            >
              <LogOut aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Cerrar sesión</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
