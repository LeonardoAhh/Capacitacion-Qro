"use client"

import { useId } from "react"
import { Check, ChevronRight, LogOut, Monitor, Moon, Settings, Sun, type LucideIcon } from "lucide-react"
import { ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { useTheme } from "@/components/theme-context"
import { WORKSPACE_ICON } from "@/components/workspace-switcher"
import { useRole } from "@/lib/hooks/useRole"
import { WORKSPACE_OPTIONS, type WorkspaceId } from "@/lib/navigation"
import { THEME_MODE_LABELS, type ThemeMode } from "@/lib/theme/constants"
import { cn } from "@/lib/utils"

const THEME_ICON: Record<ThemeMode, LucideIcon> = { light: Sun, dark: Moon, system: Monitor }
const THEME_OPTIONS = (Object.keys(THEME_MODE_LABELS) as ThemeMode[])
  .map(value => ({ value, label: THEME_MODE_LABELS[value], icon: THEME_ICON[value] }))
// Mismas filas que el menú de cuenta en escritorio: ícono, texto y palomita en la elegida.
const ROW = "flex min-h-(--control-height) w-full items-center gap-3 rounded-md px-3 text-left text-body-md text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
const ICON = "size-4 shrink-0 text-muted-foreground"

/** Grupo de opciones como filas; la elegida lleva palomita. */
function Opciones<T extends string>({ label, value, options, onChange }: {
  label: string
  value: T
  options: readonly { value: T; label: string; icon: LucideIcon; disabled?: boolean }[]
  onChange: (value: T) => void
}) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="grid gap-1">
      <p id={id} className="px-3 text-eyebrow uppercase text-muted-foreground">{label}</p>
      {options.map(option => {
        const elegida = option.value === value
        return (
          <button key={option.value} type="button" aria-pressed={elegida} disabled={option.disabled}
            className={cn(ROW, elegida && "font-medium")} onClick={() => onChange(option.value)}>
            <option.icon className={ICON} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            {elegida && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Menú de la cuenta en el celular: hoja inferior con todo a la vista (espacio de trabajo,
 * configuración y salir), en lugar de un desplegable con submenús que tapa la navegación.
 * El tema vive en Configuración; solo quien no tiene Configuración (evaluador) lo ve aquí.
 */
export function AccountSheet({ open, onClose, displayName, roleLabel, workspace, onWorkspaceChange, showSettings, showTheme, onSettings, signingOut, onLogout }: {
  open: boolean
  onClose: () => void
  displayName: string
  roleLabel: string | null
  workspace: WorkspaceId
  onWorkspaceChange: (workspace: WorkspaceId) => void
  showSettings: boolean
  showTheme: boolean
  onSettings: () => void
  signingOut: boolean
  onLogout: () => void
}) {
  const { workspaces } = useRole()
  const { themeMode, setThemeMode } = useTheme()

  return (
    <ResponsiveShell open={open} onClose={onClose} size="xs" title={`Cuenta de ${displayName}`}>
      <ModalHeader title={displayName} subtitle={roleLabel ?? undefined} onClose={onClose} />
      <div className="safe-bottom-content grid min-h-0 gap-3 overflow-y-auto px-2 pt-3">
        {/* Sin espacios de trabajo (evaluador) no hay nada que cambiar. */}
        {workspaces.length > 0 && (
          <Opciones label="Espacio de trabajo" value={workspace}
            options={WORKSPACE_OPTIONS.map(option => ({ value: option.id, label: option.label, icon: WORKSPACE_ICON[option.id], disabled: !workspaces.includes(option.id) }))}
            onChange={next => { if (next !== workspace) onWorkspaceChange(next) }} />
        )}
        {showTheme && <Opciones label="Tema" value={themeMode} options={THEME_OPTIONS} onChange={setThemeMode} />}
        <div className="grid gap-1 border-t pt-3">
          {showSettings && (
            <button type="button" className={ROW} onClick={onSettings}>
              <Settings className={ICON} aria-hidden="true" />
              <span className="flex-1">Configuración</span>
              <ChevronRight className={ICON} aria-hidden="true" />
            </button>
          )}
          <button type="button" className={cn(ROW, "text-destructive hover:bg-destructive/10")} disabled={signingOut} onClick={onLogout}>
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
        </div>
      </div>
    </ResponsiveShell>
  )
}
