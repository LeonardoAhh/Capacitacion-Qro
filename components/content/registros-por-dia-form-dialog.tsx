"use client"

import { useId, useRef } from "react"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { DateTextInput } from "@/components/ui/date-text-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCount, formatMinutes, MAX_CANTIDAD, textosRegistro, tipoLabels, type RegistroPorDiaConfig, type ValoresDia } from "@/lib/plantilla/registros-por-dia"

interface RegistroPorDiaFormDialogProps {
  config: RegistroPorDiaConfig
  open: boolean
  onOpenChange: (open: boolean) => void
  saving: boolean
  date: string
  count: string
  /** Solo se usa si config.conMinutos. */
  minutes: string
  /** Solo se usa si config.tipos: reemplaza a la cantidad. */
  tipos: string[]
  existing: ValoresDia | null
  employeeName: string
  employeeNumber: string
  error: string | null
  onDateChange: (date: string) => void
  onCountChange: (count: string) => void
  onMinutesChange: (minutes: string) => void
  onTiposChange: (tipos: string[]) => void
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
  tipos,
  existing,
  employeeName,
  employeeNumber,
  error,
  onDateChange,
  onCountChange,
  onMinutesChange,
  onTiposChange,
  onSave,
  onReturnFocus,
}: RegistroPorDiaFormDialogProps) {
  const formId = useId()
  const existingId = `${formId}-existente`
  const errorId = `${formId}-error`
  const dateInputRef = useRef<HTMLInputElement>(null)
  const describedBy = [existing && existingId, error && errorId].filter(Boolean).join(" ") || undefined
  const existingDetail = existing
    ? config.conMinutos ? formatMinutes(existing.minutos) : tipoLabels(config, existing.tipos).join(", ")
    : ""
  const existingLabel = existing
    ? existingDetail ? `${formatCount(existing.cantidad, config)} (${existingDetail})` : formatCount(existing.cantidad, config)
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        footer={
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" className="touch-target" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form={formId} size="sm" className="touch-target" disabled={saving} aria-busy={saving || undefined}>
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
          <DialogTitle>{textosRegistro(config).nuevo}</DialogTitle>
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
            <div className={config.conMinutos || config.tipos ? "min-w-0 space-y-2 sm:col-span-2" : "min-w-0 space-y-2"}>
              <Label htmlFor={`${formId}-fecha`}>Fecha</Label>
              <DateTextInput
                ref={dateInputRef}
                id={`${formId}-fecha`}
                required
                value={date}
                onValueChange={onDateChange}
                disabled={saving}
              />
            </div>
            {config.tipos ? (
              // Un tipo por omisión: la cantidad del día es cuántos se marcan.
              <fieldset className="min-w-0 space-y-2 sm:col-span-2" aria-describedby={describedBy}>
                <legend className="text-label-sm text-foreground">Tipos del día</legend>
                <div className="grid gap-x-4 sm:grid-cols-2">
                  {config.tipos.map(tipo => {
                    const checkboxId = `${formId}-tipo-${tipo.value}`
                    return (
                      <label key={tipo.value} htmlFor={checkboxId} className="flex min-h-(--control-height) cursor-pointer items-center gap-2 text-body-md text-foreground">
                        <Checkbox
                          id={checkboxId}
                          checked={tipos.includes(tipo.value)}
                          disabled={saving}
                          onCheckedChange={value => onTiposChange(value === true
                            ? [...tipos, tipo.value]
                            : tipos.filter(item => item !== tipo.value))}
                        />
                        {tipo.label}
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            ) : (
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
            )}
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
              Ya hay {existingLabel} este día. {config.tipos ? "Marca todos los tipos del día." : "Si hubo reincidencia, captura el nuevo total."}
            </p>
          )}
          {error && <p id={errorId} role="alert" className="text-body-sm text-destructive">{error}</p>}
        </form>
      </DialogContent>
    </Dialog>
  )
}
