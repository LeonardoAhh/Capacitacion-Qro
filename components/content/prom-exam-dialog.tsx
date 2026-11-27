"use client"

import { useRef, useState } from "react"
import { ClipboardCheck, Trash2, TriangleAlert } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DateTextInput } from "@/components/ui/date-text-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { notify } from "@/lib/notify"
import {
  EXAM_DIALOG_COPY,
  formatPromotionDate,
  todayAsLocalDate,
} from "@/lib/promociones/dialog-config"
import type { EmpleadoPromocion, ExamenPromocionInput } from "@/lib/promociones/types"
import { PROMOTION_ICON } from "@/lib/promociones/icon-styles"
import { calcularDesbloqueoExamen } from "@/lib/promociones/utils"
import { PromEmployeeSummary } from "./prom-employee-summary"
import { describeSupabaseError } from "@/lib/supabase/errors"

interface PromExamDialogProps {
  empleado: EmpleadoPromocion
  open: boolean
  isReadOnly: boolean
  onClose: () => void
  onGuardar: (datos: ExamenPromocionInput) => Promise<void>
}

type ExamErrorField = "date" | "score" | "form" | null

export function PromExamDialog({
  empleado,
  open,
  isReadOnly,
  onClose,
  onGuardar,
}: PromExamDialogProps) {
  const fechaDesbloqueo = calcularDesbloqueoExamen(empleado)
  const [fechaExamen, setFechaExamen] = useState(empleado.fechaExamenGuardada || todayAsLocalDate())
  const [calExamen, setCalExamen] = useState(
    empleado.calificacionExamen != null ? String(empleado.calificacionExamen) : "",
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mostrarError = (mensaje: string) => {
    setError(mensaje)
    notify.error(mensaje)
  }
  const [errorField, setErrorField] = useState<ExamErrorField>(null)

  const dateRef = useRef<HTMLInputElement>(null)
  const scoreRef = useRef<HTMLInputElement>(null)

  const handleClose = () => {
    if (!guardando) onClose()
  }

  const clearError = () => {
    if (error) {
      setError(null)
      setErrorField(null)
    }
  }

  async function ejecutar(datos: ExamenPromocionInput, fallback: string) {
    setGuardando(true)
    setError(null)
    setErrorField(null)
    try {
      await onGuardar(datos)
      onClose()
    } catch (cause: unknown) {
      mostrarError(describeSupabaseError(cause, fallback))
      setErrorField("form")
    } finally {
      setGuardando(false)
    }
  }

  function guardar() {
    if (disabled) return
    const calificacion = Number(calExamen)
    if (!fechaExamen) {
      mostrarError(EXAM_DIALOG_COPY.missingDate)
      setErrorField("date")
      dateRef.current?.focus()
      return
    }
    if (fechaExamen <= empleado.fechaIngresoPuesto) {
      mostrarError(EXAM_DIALOG_COPY.invalidDate)
      setErrorField("date")
      dateRef.current?.focus()
      return
    }
    if (calExamen === "" || !Number.isFinite(calificacion) || calificacion < 0 || calificacion > 100) {
      mostrarError(EXAM_DIALOG_COPY.invalidScore)
      setErrorField("score")
      scoreRef.current?.focus()
      return
    }

    void ejecutar({
      fechaExamen,
      calExamen: calificacion,
      intentosPrevios: empleado.intentosExamen,
      nuevoIntento: empleado.calificacionExamen == null || fechaExamen !== empleado.fechaExamenGuardada,
    }, EXAM_DIALOG_COPY.saveError)
  }

  async function borrar() {
    if (disabled) return
    const confirmed = await notify.confirm({
      title: "Borrar examen",
      description: `Se eliminará la calificación de examen de ${empleado.nombre}.`,
      confirmLabel: "Borrar",
      tone: "destructive",
    })
    if (!confirmed) return
    await ejecutar({
      fechaExamen: "",
      calExamen: null,
      intentosPrevios: empleado.intentosExamen,
      nuevoIntento: false,
    }, EXAM_DIALOG_COPY.deleteError)
  }

  const disabled = guardando || isReadOnly || !!fechaDesbloqueo

  return (
    <ResponsiveShell
      open={open}
      onClose={handleClose}
      size="sm"
      title={EXAM_DIALOG_COPY.title}
      description={empleado.nombre}
    >
      <ModalHeader title={EXAM_DIALOG_COPY.title} onClose={handleClose} />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-card px-4 py-4 sm:px-6">
        <PromEmployeeSummary empleado={empleado} />

        <form id="prom-exam-form" noValidate className="space-y-4" onSubmit={event => { event.preventDefault(); guardar() }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prom-exam-date">{EXAM_DIALOG_COPY.dateLabel}</Label>
              <DateTextInput
                ref={dateRef}
                id="prom-exam-date"
                value={fechaExamen}
                onValueChange={fecha => {
                  setFechaExamen(fecha)
                  clearError()
                }}
                aria-invalid={errorField === "date" || undefined}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prom-exam-score">{EXAM_DIALOG_COPY.scoreLabel}</Label>
              <Input
                ref={scoreRef}
                id="prom-exam-score"
                type="number"
                min={0}
                max={100}
                step={0.01}
                inputMode="decimal"
                placeholder={EXAM_DIALOG_COPY.scoreHint}
                value={calExamen}
                onChange={event => {
                  setCalExamen(event.target.value)
                  clearError()
                }}
                aria-invalid={errorField === "score" || undefined}
                disabled={disabled}
              />
            </div>
          </div>

          <dl className="flex flex-wrap gap-x-6 gap-y-1.5 text-body-sm text-muted-foreground">
            <div className="flex items-baseline gap-1.5">
              <dt>{EXAM_DIALOG_COPY.attemptsLabel}:</dt>
              <dd className="font-medium tabular-nums text-foreground">{empleado.intentosExamen ?? 0}</dd>
            </div>
            {empleado.regla?.minCalificacionExamen != null && (
              <div className="flex items-baseline gap-1.5">
                <dt>{EXAM_DIALOG_COPY.minimumLabel}:</dt>
                <dd className="font-medium tabular-nums text-foreground">{empleado.regla.minCalificacionExamen}</dd>
              </div>
            )}
          </dl>
        </form>

        {isReadOnly && (
          <p className="text-body-sm text-muted-foreground">Solo lectura. No tienes permiso para editar este examen.</p>
        )}

        {fechaDesbloqueo && (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden="true" className={PROMOTION_ICON.control} />
            <AlertDescription>
              Límite de intentos agotado. Podrás registrar otro examen el {formatPromotionDate(fechaDesbloqueo)}.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <ModalFooter
        onCancel={handleClose}
        onConfirm={guardar}
        confirmLabel={EXAM_DIALOG_COPY.saveLabel}
        confirmIcon={<ClipboardCheck aria-hidden="true" />}
        confirmDisabled={disabled}
        saving={guardando}
        secondaryAction={empleado.calificacionExamen != null ? {
          icon: <Trash2 aria-hidden="true" />,
          label: EXAM_DIALOG_COPY.deleteLabel,
          onClick: () => { void borrar() },
          disabled,
          variant: "ghost",
        } : undefined}
      />
    </ResponsiveShell>
  )
}
