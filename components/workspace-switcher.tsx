"use client"

import { GraduationCap, HardHat } from "lucide-react"
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { BRAND_NAME, APP_NAME } from "@/lib/constants/company"
import { WORKSPACE_OPTIONS, type WorkspaceId } from "@/lib/navigation"
import { AppMark } from "@/components/app-transition"
import { useRole } from "@/lib/hooks/useRole"
import { SIDEBAR_MENU_ITEM, SIDEBAR_MENU_ROW } from "@/components/sidebar-density"

const WORKSPACE_ICON = { training: GraduationCap, safety: HardHat } satisfies Record<WorkspaceId, unknown>

function workspaceLabel(workspace: WorkspaceId) {
  return workspace === "safety" ? "Seguridad e Higiene" : APP_NAME
}

interface WorkspaceBrandProps {
  workspace: WorkspaceId
  mobile?: boolean
  collapsed?: boolean
}

/** Encabezado de la barra lateral: espacio de trabajo actual y empresa. Se cambia desde el menú de cuenta. */
export function WorkspaceBrand({ workspace, mobile = false, collapsed = false }: WorkspaceBrandProps) {
  const label = workspaceLabel(workspace)
  const Icon = WORKSPACE_ICON[workspace]

  return (
    <div
      className={cn("flex min-h-11 min-w-0 flex-1 items-center gap-2 px-2", mobile && "mr-11", collapsed && "justify-center")}
    >
      {mobile
        ? <AppMark className="size-8 shrink-0" />
        : <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
      {collapsed ? (
        <span className="sr-only">{label} · {BRAND_NAME}</span>
      ) : (
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-label-sm text-foreground">{label}</span>
          <span className="truncate text-body-sm text-muted-foreground">{BRAND_NAME}</span>
        </span>
      )}
    </div>
  )
}

interface WorkspaceMenuSubProps {
  workspace: WorkspaceId
  onWorkspaceChange: (workspace: WorkspaceId) => void
  /** Tras cambiar (p. ej. cerrar el menú móvil). */
  onChanged?: () => void
}

/** Submenú "Espacio de trabajo" dentro del menú de cuenta. Los espacios que el rol no tiene se ven deshabilitados. */
export function WorkspaceMenuSub({ workspace, onWorkspaceChange, onChanged }: WorkspaceMenuSubProps) {
  const { workspaces } = useRole()
  const Icon = WORKSPACE_ICON[workspace]

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className={SIDEBAR_MENU_ITEM}>
        <Icon className="text-muted-foreground" aria-hidden="true" />
        <span className="flex-1">Espacio de trabajo</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent sideOffset={4}>
        <DropdownMenuRadioGroup
          value={workspace}
          onValueChange={(value) => {
            const next = WORKSPACE_OPTIONS.find((option) => option.id === value)
            if (!next || next.id === workspace) return
            onWorkspaceChange(next.id)
            onChanged?.()
          }}
        >
          {WORKSPACE_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.id} value={option.id}
              disabled={!workspaces.includes(option.id)} className={SIDEBAR_MENU_ROW}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
