"use client"

import { useRef, useState } from "react"
import { AlertCircle, Upload } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { Textarea } from "@/components/ui/textarea"
import { notify } from "@/lib/notify"
import { describeSupabaseError } from "@/lib/supabase/errors"
import {
  parseEmployeeDayCountJson,
  type EmployeeDayCountImport,
} from "@/lib/imports/employee-day-count-json"

interface EmployeeDayCountImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  itemSingular: string
  itemPlural: string
  onReplaceMonths: (payload: EmployeeDayCountImport) => Promise<{ success: boolean; error?: string }>
  /** Lector del archivo; por defecto el formato numero_empleado/mes/días. */
  parse?: (json: string) => EmployeeDayCountImport
  /** Ejemplo del formato esperado. */
  placeholder?: string
  /** Explicación bajo el encabezado. */
  note?: string
  /** Validación asíncrona previa a la carga; devuelve el mensaje de error o null. */
  validate?: (payload: EmployeeDayCountImport) => Promise<string | null>
}

const DEFAULT_PLACEHOLDER = `[\n  {\n    "1": "0",\n    "23": "1",\n    "numero_empleado": "2160",\n    "mes": "2026-06"\n  }\n]`
const DEFAULT_NOTE = "Se reemplazan únicamente los meses incluidos en el archivo, completos para todos los empleados. Los días en cero no se guardan."

function sumMinutes(registros: EmployeeDayCountImport["meses"][number]["registros"]): number | null {
  if (!registros.some(registro => registro.minutos !== undefined)) return null
  return registros.reduce((sum, registro) => sum + (registro.minutos ?? 0), 0)
}

function formatMonth(month: string): string {
  const date = new Date(`${month}-01T00:00:00Z`)
  const label = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
  return label.charAt(0).toLocaleUpperCase("es-MX") + label.slice(1)
}

export function EmployeeDayCountImportDialog({
  open,
  onOpenChange,
  title,
  description,
  itemSingular,
  itemPlural,
  onReplaceMonths,
  parse = parseEmployeeDayCountJson,
  placeholder = DEFAULT_PLACEHOLDER,
  note = DEFAULT_NOTE,
  validate,
}: EmployeeDayCountImportDialogProps) {
  const [saving, setSaving] = useState(false)
  const [jsonText, setJsonText] = useState("")
  const [preview, setPreview] = useState<EmployeeDayCountImport | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  // Descarta resultados de validaciones de un texto que ya cambió.
  const validationRun = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetValidation = () => {
    validationRun.current += 1
    setValidating(false)
    setValidationError(null)
  }

  const clearImport = () => {
    setJsonText("")
    setPreview(null)
    setParseError(null)
    resetValidation()
  }

  const runValidation = (payload: EmployeeDayCountImport) => {
    if (!validate) return
    const run = validationRun.current
    setValidating(true)
    validate(payload)
      .then(message => {
        if (run === validationRun.current) setValidationError(message)
      })
      .catch(caught => {
        if (run === validationRun.current) setValidationError(describeSupabaseError(caught, "No se pudo validar el archivo contra Plantilla."))
      })
      .finally(() => {
        if (run === validationRun.current) setValidating(false)
      })
  }

  const closeDialog = (nextOpen: boolean) => {
    if (!nextOpen) clearImport()
    onOpenChange(nextOpen)
  }

  const parseText = (text: string) => {
    setJsonText(text)
    setPreview(null)
    setParseError(null)
    resetValidation()
    if (!text.trim()) return

    try {
      const parsed = parse(text)
      setPreview(parsed)
      runValidation(parsed)
    } catch (caught) {
      setParseError(caught instanceof Error ? caught.message : "No se pudo validar el JSON.")
    }
  }

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (!file) return

    try {
      parseText(await file.text())
    } catch {
      setPreview(null)
      setParseError("No se pudo leer el archivo seleccionado.")
    }
  }

  const handleImport = async () => {
    if (!preview) return

    const months = preview.meses.map(month => month.mes)
    const monthList = months.map(formatMonth).join(", ")
    const confirmed = await notify.confirm({
      title: `Reemplazar datos de ${months.length} ${months.length === 1 ? "mes" : "meses"}`,
      description: `Se reemplazarán los meses ${monthList} para todos los empleados. Los empleados omitidos también perderán sus datos de esos meses. Escribe REEMPLAZAR para confirmar.`,
      confirmLabel: "Reemplazar meses",
      requireInputText: "REEMPLAZAR",
      tone: "warning",
    })
    if (!confirmed) return

    setSaving(true)
    try {
      const result = await onReplaceMonths(preview)
      if (!result.success) {
        notify.error(result.error ?? `No se pudieron reemplazar ${itemPlural}.`)
        return
      }

      const importedMonths = preview.meses.map(month => month.mes)
      const monthList = importedMonths.map(formatMonth).join(", ")
      clearImport()
      onOpenChange(false)
      notify.success(`Carga de ${itemPlural} completada para ${importedMonths.length} ${importedMonths.length === 1 ? "mes" : "meses"}: ${monthList}.`)
    } catch (caught) {
      notify.error(caught instanceof Error ? caught.message : `No se pudieron reemplazar ${itemPlural}.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveShell
      open={open}
      onClose={() => closeDialog(false)}
      title={title}
      description={description}
      size="lg"
      contentClassName="border-border"
    >
      <ModalHeader
        title={title}
        subtitle={description}
        onClose={() => closeDialog(false)}
      />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-card p-4 sm:p-(--card-padding)">
        <p className="text-sm text-muted-foreground">{note}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-(--control-height)"
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
          >
            <Upload className="size-4" aria-hidden="true" />
            Seleccionar JSON
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            tabIndex={-1}
            aria-label={`Seleccionar archivo JSON de ${itemPlural}`}
            onChange={handleFile}
          />
        </div>
        <Textarea
          value={jsonText}
          onChange={event => parseText(event.target.value)}
          placeholder={placeholder}
          rows={8}
          className="min-h-40 resize-y font-sans"
          aria-label={`Contenido JSON de ${itemPlural}`}
        />
        {parseError && (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        )}
        {preview && (
          <div className="space-y-2 text-sm text-foreground" role="status">
            <p>
              {preview.registrosEmpleadoMes} registros empleado-mes · {preview.totalCount} {preview.totalCount === 1 ? itemSingular : itemPlural} en {preview.meses.length} {preview.meses.length === 1 ? "mes" : "meses"}.
            </p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              {preview.meses.map(month => (
                <li key={month.mes}>
                  {formatMonth(month.mes)}: {month.empleados} {month.empleados === 1 ? "empleado" : "empleados"}, {month.totalCount} {month.totalCount === 1 ? itemSingular : itemPlural}{sumMinutes(month.registros) !== null && `, ${sumMinutes(month.registros)} min`}
                </li>
              ))}
            </ul>
            {preview.meses.some(month => month.totalCount === 0) && (
              <p>Los meses sin {itemPlural} positivos quedarán vacíos.</p>
            )}
          </div>
        )}
        {validating && (
          <p role="status" className="text-sm text-muted-foreground">Validando números de empleado en Plantilla…</p>
        )}
        {validationError && (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}
      </div>
      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-card px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
        <Button
          type="button"
          variant="outline"
          className="min-h-(--control-height)"
          onClick={() => closeDialog(false)}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          className="min-h-(--control-height)"
          onClick={() => void handleImport()}
          disabled={!preview || saving || validating || Boolean(validationError)}
        >
          {saving ? "Reemplazando..." : "Cargar datos"}
        </Button>
      </div>
    </ResponsiveShell>
  )
}
