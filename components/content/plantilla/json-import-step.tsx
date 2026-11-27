"use client"

import { useId, type ReactNode } from "react"
import { AlertCircle, ArrowLeft, RotateCcw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { PanelStats, type PanelStat } from "@/components/dashboard-panel"

interface JsonImportErrorProps {
  title: string
  children?: ReactNode
}

export function JsonImportError({ title, children }: JsonImportErrorProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" aria-hidden="true" />
      <AlertDescription className="space-y-1">
        <p className="text-label-sm">{title}</p>
        {children}
      </AlertDescription>
    </Alert>
  )
}

interface JsonPasteStepProps {
  value: string
  placeholder: string
  disabled?: boolean
  loading?: boolean
  hasError?: boolean
  errorSlot?: ReactNode
  onChange: (value: string) => void
  onClear: () => void
  onValidate: () => void
}

/** Paso 1 compartido para cargas masivas por JSON en /plantilla. */
export function JsonPasteStep({
  value,
  placeholder,
  disabled = false,
  loading = false,
  hasError = false,
  errorSlot,
  onChange,
  onClear,
  onValidate,
}: JsonPasteStepProps) {
  const textareaId = useId()

  if (loading) {
    return (
      <div role="status" aria-label="Cargando datos de referencia" className="max-w-3xl space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-64 w-full rounded-md" />
        <div className="flex justify-end">
          <Skeleton className="h-(--control-height-sm) w-24 rounded-md" />
        </div>
      </div>
    )
  }

  return (
    <section aria-label="Captura de datos en JSON" className="step-enter max-w-3xl space-y-3">
      <div className="space-y-2">
        <Label htmlFor={textareaId}>Datos en JSON</Label>
        <Textarea
          id={textareaId}
          spellCheck={false}
          value={value}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="h-64 resize-none overflow-y-auto text-body-sm tabular-nums"
        />
      </div>

      {errorSlot}

      <div className="flex items-center justify-end gap-2">
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={onClear}
          >
            <RotateCcw aria-hidden="true" />
            Limpiar
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          disabled={disabled || !value.trim()}
          onClick={onValidate}
        >
          Validar
        </Button>
      </div>
    </section>
  )
}

interface JsonReviewHeaderProps {
  stats: PanelStat[]
  disabled?: boolean
  onBack: () => void
}

/** Encabezado del paso 2: resumen numérico y retorno al editor sin perder el JSON. */
export function JsonReviewHeader({ stats, disabled = false, onBack }: JsonReviewHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <PanelStats items={stats} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={onBack}
      >
        <ArrowLeft aria-hidden="true" />
        Editar JSON
      </Button>
    </div>
  )
}
