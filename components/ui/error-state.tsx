"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { AlertCircle, FileQuestion, Lock, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorkspaceBackdrop } from "@/components/workspace-backdrop"
import { cn } from "@/lib/utils"

export type ErrorStateTone = "neutral" | "warning" | "destructive"

type Action = { label: string; icon?: LucideIcon } & (
  | { href: string; onClick?: () => void }
  | { href?: undefined; onClick: () => void }
)

interface ErrorStateProps {
  icon?: LucideIcon
  code?: string
  title: string
  description?: string
  tone?: ErrorStateTone
  primaryAction?: Action
  secondaryAction?: Action
  children?: ReactNode
  className?: string
  /** Cuando es true (por defecto), envuelve en el lienzo completo del workspace. */
  fullScreen?: boolean
}

const TONE_CLASSES: Record<ErrorStateTone, string> = {
  destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  warning: "border-warning/30 bg-warning/10 text-warning-deep",
  neutral: "border-border bg-muted text-muted-foreground",
}

function ActionButton({ action, variant }: { action: Action; variant: "default" | "outline" }) {
  const Icon = action.icon
  if (action.href) {
    return (
      <Button variant={variant} asChild onClick={action.onClick}>
        <Link href={action.href}>
          {Icon && <Icon aria-hidden="true" />}
          {action.label}
        </Link>
      </Button>
    )
  }
  return (
    <Button type="button" variant={variant} onClick={action.onClick}>
      {Icon && <Icon aria-hidden="true" />}
      {action.label}
    </Button>
  )
}

/**
 * Superficie canónica para estados de error, 404 y sin conexión.
 * Comparte lienzo, tipografía y tokens con Login y Mantenimiento.
 */
export function ErrorState({
  icon: Icon = AlertCircle,
  code,
  title,
  description,
  tone = "neutral",
  primaryAction,
  secondaryAction,
  children,
  className,
  fullScreen = true,
}: ErrorStateProps) {
  const card = (
    <div
      className={cn(
        "surface-enter mx-auto flex w-full max-w-md flex-col items-center justify-center gap-5 rounded-xl border border-border bg-card p-(--card-padding) text-center",
        className,
      )}
    >
      <div className={cn("grid size-12 place-items-center rounded-md border", TONE_CLASSES[tone])} aria-hidden="true">
        <Icon className="size-5" strokeWidth={1.75} />
      </div>

      <div className="space-y-2">
        {code && <p className="text-eyebrow uppercase text-muted-foreground">{code}</p>}
        <h1 className="text-balance text-heading-lg text-foreground">{title}</h1>
        {description && <p className="text-pretty text-body-md text-muted-foreground">{description}</p>}
      </div>

      {children}

      {(primaryAction || secondaryAction) && (
        <div className="flex w-full flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-center">
          {secondaryAction && <ActionButton action={secondaryAction} variant="outline" />}
          {primaryAction && <ActionButton action={primaryAction} variant="default" />}
        </div>
      )}
    </div>
  )

  if (!fullScreen) return card

  return (
    <main className="workspace-shell bg-background text-foreground">
      <div className="workspace-panel min-h-0 overflow-hidden bg-card md:rounded-xl md:border md:border-border">
        <WorkspaceBackdrop className="sm:min-h-dvh md:h-full md:min-h-0">
          <div className="flex h-full min-h-dvh items-center justify-center px-4 py-10 sm:px-6 md:min-h-0">
            {card}
          </div>
        </WorkspaceBackdrop>
      </div>
    </main>
  )
}

export { AlertCircle, FileQuestion, Lock, WifiOff }
