import React from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export interface RedesignModalSecondaryAction {
  icon?: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'secondary' | 'outline' | 'ghost'
}

export interface RedesignModalFooterProps {
  onCancel?: () => void
  cancelLabel?: string
  cancelDisabled?: boolean
  onConfirm?: () => void
  confirmLabel?: string
  confirmIcon?: React.ReactNode
  confirmDisabled?: boolean
  confirmVariant?: 'primary' | 'destructive'
  saving?: boolean
  secondaryAction?: RedesignModalSecondaryAction
  confirmTooltip?: string
}

export function RedesignModalFooter({
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
  confirmTooltip,
}: RedesignModalFooterProps) {
  const confirmButton = onConfirm && (
    <Button
      type="button"
      variant={confirmVariant === 'destructive' ? "destructive" : "default"}
      onClick={onConfirm}
      disabled={saving || confirmDisabled}
      aria-busy={saving || undefined}
    >
      {saving ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : confirmIcon}
      {confirmLabel}
    </Button>
  )

  return (
    <div className="mt-auto flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 sm:px-6">
      <div className="flex-1">
        {secondaryAction && (
          <Button
            type="button"
            variant={secondaryAction.variant ?? "outline"}
            onClick={secondaryAction.onClick}
            disabled={saving || secondaryAction.disabled}
          >
            {secondaryAction.icon}
            {secondaryAction.label}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving || cancelDisabled}>
            {cancelLabel}
          </Button>
        )}
        {confirmButton && (confirmTooltip ? (
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                {/* Un botón deshabilitado no recibe eventos; el contenedor enfocable expone el motivo. */}
                <span tabIndex={saving || confirmDisabled ? 0 : undefined} aria-label={saving || confirmDisabled ? confirmTooltip : undefined} className="inline-flex cursor-not-allowed rounded-md">
                  {confirmButton}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">{confirmTooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : confirmButton)}
      </div>
    </div>
  )
}
