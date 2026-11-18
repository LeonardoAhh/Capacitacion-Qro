"use client"

import { useId, useRef } from "react"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCount, formatMinutes, MAX_CANTIDAD, type RegistroPorDiaConfig, type ValoresDia } from "@/lib/plantilla/registros-por-dia"

interface RegistroPorDiaFormDialogProps {
  config: RegistroPorDiaConfig
  open: boolean
  onOpenChange: (open: boolean) => void
  saving: boolean
  date: string
  count: string
  /** Solo se usa si config.conMinutos. */
  minutes: string
  existing: ValoresDia | null
  employeeName: string
  employeeNumber: string
  error: string | null
  onDateChange: (date: string) => void
  onCountChange: (count: string) => void
  onMinutesChange: (minutes: string) => void
  onSave: () => void
  onReturnFocus: () => void
}

/** Captura de la cantidad total de un día; presentacional, el estado vive en la ficha. */
export function RegistroPorDiaFormDialog({
  config,
  open,
  onOpenChange,
  saving,
  date,
  count,
  minutes,
  existing,
  employeeName,
  employeeNumber,
  error,
  onDateChange,
  onCountChange,
  onMinutesChange,
  onSave,
  onReturnFocus,
}: RegistroPorDiaFormDialogProps) {
  const formId = useId()
  const existingId = `${formId}-existente`
  const errorId = `${formId}-error`
  const dateInputRef = useRef<HTMLInputElement>(null)
  const describedBy = [existing && existingId, error && errorId].filter(Boolean).join(" ") || undefined
  const existingLabel = existing
    ? config.conMinutos ? `${formatCount(existing.cantidad, config)} (${formatMinutes(existing.minutos)})` : formatCount(existing.cantidad, config)
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        footer={
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form={formId} size="sm" disabled={saving} aria-busy={saving || undefined}>
              {saving ? "Guardando…" : existing ? "Actualizar" : "Guardar"}
            </Button>
          </DialogFooter>
        }
        onOpenAutoFocus={event => {
          event.preventDefault()
          dateInputRef.current?.focus()
        }}
        onCloseAutoFocus={event => {
          event.preventDefault()
          onReturnFocus()
        }}
        onEscapeKeyDown={event => {
          if (saving) event.preventDefault()
        }}
        onPointerDownOutside={event => {
          if (saving) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Nuevo {config.singular}</DialogTitle>
          <DialogDescription>{employeeName} · Núm. {employeeNumber}</DialogDescription>
        </DialogHeader>

        <form
          id={formId}
          onSubmit={event => {
            event.preventDefault()
            onSave()
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={config.conMinutos ? "min-w-0 space-y-2 sm:col-span-2" : "min-w-0 space-y-2"}>
              <Label htmlFor={`${formId}-fecha`}>Fecha</Label>
              <Input
                ref={dateInputRef}
                id={`${formId}-fecha`}
                type="date"
                required
                value={date}
                onChange={event => onDateChange(event.target.value)}
                disabled={saving}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor={`${formId}-cantidad`}>Cantidad total del día</Label>
              <Input
                id={`${formId}-cantidad`}
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_CANTIDAD}
                step={1}
                required
                value={count}
                onChange={event => onCountChange(event.target.value)}
                disabled={saving}
                aria-invalid={Boolean(error) || undefined}
                aria-describedby={describedBy}
                className="tabular-nums"
              />
            </div>
            {config.conMinutos && <div className="min-w-0 space-y-2">
              <Label htmlFor={`${formId}-minutos`}>Minutos totales del día</Label>
              <Input
                id={`${formId}-minutos`}
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_CANTIDAD}
                step={1}
                required
                value={minutes}
                onChange={event => onMinutesChange(event.target.value)}
                disabled={saving}
                aria-invalid={Boolean(error) || undefined}
                aria-describedby={describedBy}
                className="tabular-nums"
              />
            </div>}
          </div>

          {existingLabel && (
            <p id={existingId} role="status" className="flex items-start gap-2 rounded-md bg-muted p-3 text-body-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Ya hay {existingLabel} este día. Si hubo reincidencia, captura el nuevo total.
            </p>
          )}
          {error && <p id={errorId} role="alert" className="text-body-sm text-destructive">{error}</p>}
        </form>
      </DialogContent>
    </Dialog>
  )
}
