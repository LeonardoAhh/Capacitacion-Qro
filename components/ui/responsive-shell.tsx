"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ─────────────────────────────────────────────────────────────────────────────
// ModalHeader / ModalFooter
// ─────────────────────────────────────────────────────────────────────────────

export interface ModalHeaderProps {
  title: string
  subtitle?: string
  onClose?: () => void
}

export function ModalHeader({ title, subtitle, onClose }: ModalHeaderProps) {
  return (
    <DialogHeader className="sticky top-0 z-10 mb-0 flex-row items-center justify-between gap-4 border-b bg-card px-4 py-1 text-left sm:px-6">
      <div className="flex-1 min-w-0">
        <h2 className="break-words text-heading-md text-foreground">{title}</h2>
        {subtitle && (
          <p className="sr-only">{subtitle}</p>
        )}
      </div>
      {onClose && (
        <DialogClose asChild>
          <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Cerrar modal">
            <X aria-hidden="true" />
          </Button>
        </DialogClose>
      )}
    </DialogHeader>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ModalFooter — action buttons at the bottom
// ─────────────────────────────────────────────────────────────────────────────

export interface ModalSecondaryAction {
  icon?: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'secondary' | 'outline' | 'ghost'
}

export interface ModalFooterProps {
  className?: string
  onCancel?: () => void
  cancelLabel?: string
  cancelDisabled?: boolean
  onConfirm?: () => void
  confirmLabel?: string
  confirmIcon?: React.ReactNode
  confirmDisabled?: boolean
  confirmVariant?: 'primary' | 'destructive' | 'warning'
  saving?: boolean
  secondaryAction?: ModalSecondaryAction
}

export function ModalFooter({
  className,
  onCancel,
  cancelLabel = "Cancelar",
  cancelDisabled,
  onConfirm,
  confirmLabel = "Guardar",
  confirmIcon,
  confirmDisabled,
  confirmVariant = 'primary',
  saving,
  secondaryAction,
}: ModalFooterProps) {
  // Button no tiene variante warning; se aplica con tokens semánticos.
  const confirmButtonVariant = confirmVariant === 'destructive' ? "destructive" : "default"
  const confirmWarningClasses = confirmVariant === 'warning' ? "bg-warning text-warning-foreground hover:bg-warning/90" : undefined

  return (
    <DialogFooter detached className={cn("mt-auto shrink-0 items-stretch border-t bg-card px-4 py-3 sm:items-center sm:justify-between sm:gap-3 sm:px-6", className)}>
      <div className="sm:flex-1">
        {secondaryAction && (
          <Button
            type="button"
            variant={secondaryAction.variant ?? "secondary"}
            size="sm"
            onClick={secondaryAction.onClick}
            disabled={saving || secondaryAction.disabled}
            className="w-full sm:w-auto"
          >
            {secondaryAction.icon}
            {secondaryAction.label}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving || cancelDisabled}>
            {cancelLabel}
          </Button>
        )}
        {onConfirm && (
          <Button
            type="button"
            variant={confirmButtonVariant}
            size="sm"
            onClick={onConfirm}
            disabled={saving || confirmDisabled}
            aria-busy={saving || undefined}
            className={confirmWarningClasses}
          >
            {saving ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : confirmIcon}
            {confirmLabel}
          </Button>
        )}
      </div>
    </DialogFooter>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ResponsiveShell — shared bottom sheet on mobile, centered Dialog on larger screens
// ─────────────────────────────────────────────────────────────────────────────

export type ModalSize = "xs" | "sm" | "md" | "lg" | "xl"

const MODAL_WIDTHS: Record<ModalSize, string> = {
  xs: "sm:max-w-md",
  sm: "sm:max-w-lg",
  md: "sm:max-w-2xl",
  lg: "sm:max-w-4xl",
  xl: "sm:max-w-5xl",
}

export interface ResponsiveShellProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  size?: ModalSize
  maxWidth?: string
  contentClassName?: string
  /** @deprecated The shared Dialog primitive controls the responsive presentation. */
  mobileVariant?: 'drawer' | 'dialog'
  title: string
  description?: string
}

export function ResponsiveShell({
  open, onClose, children, size, maxWidth, contentClassName, title, description,
}: ResponsiveShellProps) {
  const previousFocus = React.useRef<HTMLElement | null>(null)
  const titleRef = React.useRef<HTMLHeadingElement>(null)
  const widthClassName = size ? MODAL_WIDTHS[size] : maxWidth ?? MODAL_WIDTHS.sm

  return (
    <Dialog open={open} onOpenChange={nextOpen => { if (!nextOpen) onClose() }}>
      <DialogContent
        raw
        onOpenAutoFocus={event => {
          previousFocus.current = document.activeElement as HTMLElement | null
          event.preventDefault()
          titleRef.current?.focus()
        }}
        onCloseAutoFocus={event => {
          event.preventDefault()
          previousFocus.current?.focus()
        }}
        className={cn(widthClassName, "p-0 gap-0", contentClassName)}
      >
        <DialogTitle ref={titleRef} tabIndex={-1} className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description ?? title}</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  )
}
