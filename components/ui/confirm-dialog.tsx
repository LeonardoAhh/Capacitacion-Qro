"use client"

import * as React from "react"
import { BadgeCheck, CircleHelp, Info, OctagonAlert, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ModalFooter, ResponsiveShell, type ModalSize } from "@/components/ui/responsive-shell"
import { cn } from "@/lib/utils"

export type ConfirmTone = "default" | "destructive" | "warning" | "info" | "success"

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  size?: ModalSize
  tone?: ConfirmTone
  appearance?: "standard" | "minimal"
  icon?: React.ReactNode
  requireInputText?: string
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
  resolve?: (value: boolean) => void
}

type Listener = (state: ConfirmState) => void
const listeners = new Set<Listener>()
let currentState: ConfirmState = { open: false, title: "" }

function setState(next: ConfirmState) {
  currentState = next
  listeners.forEach(listener => listener(next))
}

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => setState({ ...options, open: true, resolve }))
}

const TONE_STYLES: Record<ConfirmTone, { container: string; icon: React.ReactNode }> = {
  default: { container: "bg-primary/10 text-primary", icon: <CircleHelp aria-hidden="true" /> },
  destructive: { container: "bg-destructive/10 text-destructive", icon: <Trash2 aria-hidden="true" /> },
  warning: { container: "bg-warning/10 text-warning-deep", icon: <OctagonAlert aria-hidden="true" /> },
  info: { container: "bg-info/10 text-info", icon: <Info aria-hidden="true" /> },
  success: { container: "bg-chart-1/15 text-chart-1-deep", icon: <BadgeCheck aria-hidden="true" /> },
}

interface ConfirmationDialogProps extends ConfirmOptions {
  open: boolean
  inputValue: string
  onInputChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmationDialog({
  open, title, description, confirmLabel = "Confirmar", cancelLabel = "Cancelar",
  size = "xs", tone = "default", appearance = "standard", icon, requireInputText, inputValue,
  onInputChange, onCancel, onConfirm,
}: ConfirmationDialogProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const styles = TONE_STYLES[tone]
  const normalizedInput = inputValue.trim().toLocaleUpperCase("es-MX")
  const normalizedTarget = requireInputText?.trim().toLocaleUpperCase("es-MX") ?? ""
  const confirmDisabled = Boolean(requireInputText && normalizedInput !== normalizedTarget)
  const confirmVariant = tone === "destructive" ? "destructive" : tone === "warning" ? "warning" : "primary"
  const minimal = appearance === "minimal" || Boolean(requireInputText)
  const isUppercaseTarget = Boolean(requireInputText && requireInputText === normalizedTarget)

  React.useEffect(() => {
    if (!open || !requireInputText) return
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open, requireInputText])

  return (
    <ResponsiveShell
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size={size}
      contentClassName="border-border"
    >
      <div className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
        <div className="flex items-start gap-3">
          {!minimal && <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-md border border-current/15 bg-card [&_svg]:size-4", styles.container)}>
            {icon ?? styles.icon}
          </div>}
          <div className={cn("min-w-0 flex-1", minimal && "space-y-1")}>
            <h2 aria-hidden="true" className="text-heading-md text-foreground">{title}</h2>
            {description && <p aria-hidden="true" className={cn("text-body-md text-muted-foreground", !minimal && "mt-1")}>{description}</p>}
          </div>
        </div>
        {requireInputText && (
          <div className="mt-4 space-y-2">
            <Label htmlFor="confirm-required-text" className="text-body-md text-foreground">
              Escribe <span className="rounded-sm bg-muted px-1.5 py-0.5 font-medium text-foreground select-all">{requireInputText}</span> para confirmar
            </Label>
            <Input
              ref={inputRef}
              id="confirm-required-text"
              value={inputValue}
              onChange={event => onInputChange(isUppercaseTarget ? event.target.value.toLocaleUpperCase("es-MX") : event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter" && !confirmDisabled) {
                  event.preventDefault()
                  onConfirm()
                }
              }}
              placeholder={requireInputText}
              autoComplete="off"
              autoCapitalize={isUppercaseTarget ? "characters" : "off"}
              spellCheck={false}
            />
          </div>
        )}
      </div>
      <ModalFooter
        className="border-t-0 pt-2 sm:pb-6"
        onCancel={onCancel}
        cancelLabel={cancelLabel}
        onConfirm={onConfirm}
        confirmLabel={confirmLabel}
        confirmDisabled={confirmDisabled}
        confirmVariant={confirmVariant}
      />
    </ResponsiveShell>
  )
}

export function ConfirmProvider() {
  const [state, setLocalState] = React.useState<ConfirmState>(currentState)
  const [inputValue, setInputValue] = React.useState("")

  React.useEffect(() => {
    const listener: Listener = next => {
      setLocalState(next)
      setInputValue("")
    }
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])

  const close = React.useCallback((value: boolean) => {
    state.resolve?.(value)
    setState({ ...currentState, open: false, resolve: undefined })
  }, [state])

  return (
    <ConfirmationDialog
      {...state}
      inputValue={inputValue}
      onInputChange={setInputValue}
      onCancel={() => close(false)}
      onConfirm={() => close(true)}
    />
  )
}
