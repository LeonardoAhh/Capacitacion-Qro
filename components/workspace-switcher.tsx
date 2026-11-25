"use client"

import { GraduationCap, HardHat } from "lucide-react"
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { APP_NAME } from "@/lib/constants/company"
import { WORKSPACE_OPTIONS, type WorkspaceId } from "@/lib/navigation"
import { DESEMPENO } from "@/lib/desempeno/presentation"
import { AppMark } from "@/components/app-transition"
import { useRole } from "@/lib/hooks/useRole"
import { SIDEBAR_MENU_ITEM, SIDEBAR_MENU_ROW } from "@/components/sidebar-density"

export const WORKSPACE_ICON = { training: GraduationCap, safety: HardHat } satisfies Record<WorkspaceId, unknown>

function workspaceLabel(workspace: WorkspaceId) {
  return workspace === "safety" ? "Seguridad e Higiene" : APP_NAME
}

interface WorkspaceBrandProps {
  workspace: WorkspaceId
  mobile?: boolean
}

/**
 * Encabezado de la barra lateral, igual en todos los roles y tamaños: el ícono del sistema
 * y el espacio de trabajo actual. Los nombres largos ("Seguridad e Higiene", "Evaluación de
 * Desempeño") van en dos renglones en lugar de recortarse. Se cambia desde el menú de cuenta.
 */
export function WorkspaceBrand({ workspace, mobile = false }: WorkspaceBrandProps) {
  // Sin espacio de trabajo (evaluador): su área es Evaluación de Desempeño.
  const { workspaces } = useRole()
  const label = workspaces.length === 0 ? DESEMPENO.title : workspaceLabel(workspace)

  return (
    <div className={cn("flex min-h-(--control-height) min-w-0 flex-1 items-center gap-2 px-2", mobile && "mr-11")}>
      <AppMark className="size-6 shrink-0" />
      <span className="line-clamp-2 min-w-0 text-balance text-label-sm text-foreground">{label}</span>
    </div>
  )
}

interface WorkspaceMenuSubProps {
  workspace: WorkspaceId
  onWorkspaceChange: (workspace: WorkspaceId) => void
  /** Tras cambiar (p. ej. cerrar el menú móvil). */
  onChanged?: () => void
  /** Estilo de la fila, el mismo que las demás opciones del menú de cuenta. */
  triggerClassName?: string
  /** Estilo de cada espacio dentro del submenú. */
  itemClassName?: string
  /** Si se da, una línea debajo (solo cuando el submenú se muestra). */
  separatorClassName?: string
}

/** Submenú "Espacio de trabajo" dentro del menú de cuenta. Los espacios que el rol no tiene se ven deshabilitados. */
export function WorkspaceMenuSub({ workspace, onWorkspaceChange, onChanged, triggerClassName, itemClassName, separatorClassName }: WorkspaceMenuSubProps) {
  const { workspaces } = useRole()
  // Sin espacios de trabajo (evaluador) no hay nada que cambiar.
  if (workspaces.length === 0) return null

  return (
    <>
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className={triggerClassName ?? SIDEBAR_MENU_ITEM}>
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
              disabled={!workspaces.includes(option.id)} className={itemClassName ?? SIDEBAR_MENU_ROW}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
    {separatorClassName && <DropdownMenuSeparator className={separatorClassName} />}
    </>
  )
}
