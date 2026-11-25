"use client"

import { useEffect, useRef, useState } from "react"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { Stepper } from "@/components/ui/stepper"
import { AutoHeight } from "@/components/ui/auto-height"
import { DncNeedAuthorizationStep, DncNeedDetailsStep, DncNeedIdentityStep } from "@/components/content/dnc-need-steps"
import { aMayusculasDnc, CAMPOS_TEXTO_NECESIDAD, type DatosNecesidad, type DncCourse, type DncNecesidad, type DncPosition, type ProgramacionCurso } from "@/lib/dnc"

interface DncNeedDialogProps {
  necesidad: DncNecesidad | null
  /** Catálogo cargado una vez por la página y reutilizado en cada apertura. */
  cursos: DncCourse[]
  cursosLoading: boolean
  cursosError: string | null
  puestos: DncPosition[]
  departmentName: string
  /** Mes y tipo con los que el curso ya está en otras DNC del año, para proponerlos. */
  programacionDe: (courseId: string) => ProgramacionCurso | null
  onClose: () => void
  onSave: (datos: DatosNecesidad) => Promise<void>
}

const PROGRAMACION_INICIAL = { mes_sugerido: 1, tipo: "interno" } as const
const PASOS = ["Necesidad y puestos", "Justificación y programación", "Autorización"] as const
type Paso = 1 | 2 | 3
// Campo que recibe el foco al entrar a cada paso.
const PRIMER_CAMPO: Record<Paso, string> = { 1: "dnc-necesidad", 2: "dnc-funcion", 3: "dnc-autorizacion-autorizado" }

export function DncNeedDialog({ necesidad, cursos, cursosLoading, cursosError, puestos, departmentName, programacionDe, onClose, onSave }: DncNeedDialogProps) {
  const [step, setStep] = useState<Paso>(1)
  const [form, setForm] = useState<DatosNecesidad>({
    necesidad: necesidad?.necesidad ?? "",
    course_id: necesidad?.course_id ?? "",
    position_ids: necesidad?.position_ids ?? [],
    funcion_actividad: necesidad?.funcion_actividad ?? "",
    motivo: necesidad?.motivo ?? "",
    beneficio: necesidad?.beneficio ?? "",
    mes_sugerido: necesidad?.mes_sugerido ?? PROGRAMACION_INICIAL.mes_sugerido,
    tipo: necesidad?.tipo ?? PROGRAMACION_INICIAL.tipo,
    autorizacion: necesidad?.autorizacion ?? null,
    motivo_no_autorizado: necesidad?.motivo_no_autorizado ?? "",
  })
  // Al editar se respeta lo guardado; en una alta, mes y tipo siguen al curso hasta que se cambian a mano.
  const [programacionManual, setProgramacionManual] = useState(Boolean(necesidad))
  const programacion = form.course_id ? programacionDe(form.course_id) : null
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
    // Al elegir curso, mes y tipo toman los de otras DNC (o vuelven a los iniciales si no hay).
    const sigueAlCurso = field === "course_id" && !programacionManual && typeof value === "string"
    const previa = sigueAlCurso ? programacionDe(value) : null
    if (field === "mes_sugerido" || field === "tipo") setProgramacionManual(true)
    setForm(current => ({
      ...current,
      [field]: next,
      ...(sigueAlCurso && { mes_sugerido: previa?.mes_sugerido ?? PROGRAMACION_INICIAL.mes_sugerido, tipo: previa?.tipo ?? PROGRAMACION_INICIAL.tipo }),
    }))
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
        <Stepper steps={PASOS} current={step} />
        {/* El alto sigue al paso con transición: el modal no salta al cambiar de paso. */}
        <AutoHeight>
        {step === 1 ? (
          <DncNeedIdentityStep form={form} onChange={update} cursos={cursos} cursosLoading={cursosLoading}
            cursosError={cursosError} puestos={puestos} departmentName={departmentName}
            onPositionsChange={positionIds => {
              setForm(current => ({ ...current, position_ids: positionIds }))
              setError(null)
            }} />
        ) : step === 2
          ? <DncNeedDetailsStep form={form} onChange={update} programacion={programacion} />
          : <DncNeedAuthorizationStep form={form} onChange={update} />}
        </AutoHeight>
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
