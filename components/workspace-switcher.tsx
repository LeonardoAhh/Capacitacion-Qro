"use client"

import { ChevronDown, GraduationCap, HardHat } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { BRAND_NAME, APP_NAME } from "@/lib/constants/company"
import { WORKSPACE_OPTIONS, type WorkspaceId } from "@/lib/navigation"
import { AppMark } from "@/components/app-transition"
import { useRole } from "@/lib/hooks/useRole"
import { SIDEBAR_MENU_ITEM } from "@/components/sidebar-density"

interface WorkspaceSwitcherProps {
  workspace: WorkspaceId
  onWorkspaceChange: (workspace: WorkspaceId) => void
  onClose?: () => void
  mobile?: boolean
  collapsed?: boolean
}

export function WorkspaceSwitcher({
  workspace,
  onWorkspaceChange,
  onClose,
  mobile = false,
  collapsed = false,
}: WorkspaceSwitcherProps) {
  const workspaceLabel = workspace === "safety" ? "Seguridad e Higiene" : APP_NAME
  const WorkspaceIcon = workspace === "safety" ? HardHat : GraduationCap

  // Los espacios que el rol no tiene se ven, pero deshabilitados.
  const { workspaces } = useRole()
  const handleWorkspaceChange = (nextWorkspace: WorkspaceId) => {
    onWorkspaceChange(nextWorkspace)
    onClose?.()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Workspace actual: ${workspaceLabel}. Cambiar workspace`}
          title={collapsed ? `${workspaceLabel}. Cambiar workspace` : undefined}
          className={cn(
            "flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left outline-none transition-colors hover:text-foreground data-[state=open]:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring",
            mobile && "mr-11",
            collapsed && "justify-center",
          )}
        >
          {mobile
            ? <AppMark className="size-8 shrink-0" />
            : <WorkspaceIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
          {!collapsed && (
            <>
              <span className="flex min-w-0 flex-col" title={`${workspaceLabel} · ${BRAND_NAME}`}>
                <span className="truncate text-label-sm text-foreground">{workspaceLabel}</span>
                <span className="truncate text-body-sm text-muted-foreground">{BRAND_NAME}</span>
              </span>
              <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side={collapsed ? "right" : "bottom"}
        sideOffset={8}
        className="w-[14rem]"
      >
        {WORKSPACE_OPTIONS.map((option) => {
          const OptionIcon = option.id === "safety" ? HardHat : GraduationCap
          const isActive = option.id === workspace
          return (
            <DropdownMenuItem
              key={option.id}
              disabled={!workspaces.includes(option.id)}
              onSelect={() => handleWorkspaceChange(option.id)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                SIDEBAR_MENU_ITEM,
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground",
              )}
            >
              <OptionIcon className="shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{option.label}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
