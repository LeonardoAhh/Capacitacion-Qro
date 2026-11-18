"use client"

import { useEffect, useRef, useState } from "react"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { DncNeedAuthorizationStep, DncNeedDetailsStep, DncNeedIdentityStep } from "@/components/content/dnc-need-steps"
import { aMayusculasDnc, CAMPOS_TEXTO_NECESIDAD, type DatosNecesidad, type DncCourse, type DncNecesidad, type DncPosition } from "@/lib/dnc"

interface DncNeedDialogProps {
  necesidad: DncNecesidad | null
  /** Catálogo cargado una vez por la página y reutilizado en cada apertura. */
  cursos: DncCourse[]
  cursosLoading: boolean
  cursosError: string | null
  puestos: DncPosition[]
  departmentName: string
  onClose: () => void
  onSave: (datos: DatosNecesidad) => Promise<void>
}

const PASOS = ["Necesidad y puestos", "Justificación y programación", "Autorización"] as const
type Paso = 1 | 2 | 3
// Campo que recibe el foco al entrar a cada paso.
const PRIMER_CAMPO: Record<Paso, string> = { 1: "dnc-necesidad", 2: "dnc-funcion", 3: "dnc-autorizacion-autorizado" }

/** Indicador compacto del asistente: paso actual resaltado, anteriores en tono neutro. */
function DncNeedStepper({ step }: { step: Paso }) {
  return (
    <ol aria-label="Pasos" className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {PASOS.map((label, index) => {
        const number = index + 1
        const current = number === step
        return (
          <li key={label} aria-current={current ? "step" : undefined}
            className={current ? "flex items-center gap-2 text-label-sm text-foreground" : "flex items-center gap-2 text-body-md text-muted-foreground"}>
            {index > 0 && <span aria-hidden="true" className="h-px w-6 bg-border" />}
            <span aria-hidden="true"
              className={current
                ? "flex size-5 items-center justify-center rounded-md bg-primary text-body-sm font-medium text-primary-foreground"
                : "flex size-5 items-center justify-center rounded-md border border-border text-body-sm"}>
              {number}
            </span>
            <span><span className="sr-only">Paso {number} de {PASOS.length}: </span>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function DncNeedDialog({ necesidad, cursos, cursosLoading, cursosError, puestos, departmentName, onClose, onSave }: DncNeedDialogProps) {
  const [step, setStep] = useState<Paso>(1)
  const [form, setForm] = useState<DatosNecesidad>({
    necesidad: necesidad?.necesidad ?? "",
    course_id: necesidad?.course_id ?? "",
    position_ids: necesidad?.position_ids ?? [],
    funcion_actividad: necesidad?.funcion_actividad ?? "",
    motivo: necesidad?.motivo ?? "",
    beneficio: necesidad?.beneficio ?? "",
    mes_sugerido: necesidad?.mes_sugerido ?? 1,
    tipo: necesidad?.tipo ?? "interno",
    autorizacion: necesidad?.autorizacion ?? null,
    motivo_no_autorizado: necesidad?.motivo_no_autorizado ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFirstRender = useRef(true)
  useEffect(() => {
    // El primer paso enfoca el título del modal (ResponsiveShell); los demás, su primer campo.
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    document.getElementById(PRIMER_CAMPO[step])?.focus()
  }, [step])

  function goTo(next: Paso) {
    setError(null)
    setStep(next)
  }

  function update(field: keyof DatosNecesidad, value: string | number) {
    const isText = (CAMPOS_TEXTO_NECESIDAD as readonly string[]).includes(field)
    const next = isText && typeof value === "string" ? aMayusculasDnc(value) : value
    setForm(current => ({ ...current, [field]: next }))
    setError(null)
  }

  function handleContinue() {
    if (!form.necesidad.trim() || !form.course_id || form.position_ids.length === 0) {
      setError("Indica la necesidad, el curso y al menos un puesto.")
      return
    }
    goTo(2)
  }

  function handleContinueDetails() {
    if ([form.funcion_actividad, form.motivo, form.beneficio].some(value => !value.trim())) {
      setError("Completa la función, el motivo y el beneficio de la capacitación.")
      return
    }
    goTo(3)
  }

  async function handleSave() {
    if (!form.autorizacion) {
      setError("Indica si la necesidad fue autorizada.")
      return
    }
    if (form.autorizacion === "no_autorizado" && !form.motivo_no_autorizado?.trim()) {
      setError("Indica el motivo por el que no se autorizó.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la necesidad.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveShell open onClose={onClose} size="xl" title={necesidad ? "Editar necesidad" : "Agregar necesidad"}>
      <ModalHeader title={necesidad ? "Editar necesidad" : "Agregar necesidad"}
        onClose={onClose} />
      <div className="grid min-h-0 gap-5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
        <DncNeedStepper step={step} />
        {step === 1 ? (
          <DncNeedIdentityStep form={form} onChange={update} cursos={cursos} cursosLoading={cursosLoading}
            cursosError={cursosError} puestos={puestos} departmentName={departmentName}
            onPositionsChange={positionIds => {
              setForm(current => ({ ...current, position_ids: positionIds }))
              setError(null)
            }} />
        ) : step === 2
          ? <DncNeedDetailsStep form={form} onChange={update} />
          : <DncNeedAuthorizationStep form={form} onChange={update} />}
        {error && <p role="alert" className="-mt-2 text-body-sm text-destructive">{error}</p>}
      </div>
      <ModalFooter onCancel={step === 1 ? onClose : () => goTo(step === 3 ? 2 : 1)}
        cancelLabel={step === 1 ? "Cancelar" : "Volver"}
        onConfirm={step === 1 ? handleContinue : step === 2 ? handleContinueDetails : handleSave}
        confirmLabel={step === 3 ? "Guardar necesidad" : "Continuar"} saving={saving}
        confirmDisabled={step === 1 && (cursosLoading || Boolean(cursosError) || cursos.length === 0 || puestos.length === 0)} />
    </ResponsiveShell>
  )
}
