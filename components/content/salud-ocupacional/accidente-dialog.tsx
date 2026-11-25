"use client"

import { useEffect, useRef, useState } from "react"
import { DateTextInput } from "@/components/ui/date-text-input"
import { Label } from "@/components/ui/label"
import { Stepper } from "@/components/ui/stepper"
import { Textarea } from "@/components/ui/textarea"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { DESCRIPCION_ACCIDENTE_MAX, type Accidente, type DatosAccidente } from "@/lib/salud-ocupacional"
import { FIELD } from "./accidente-campos"
import { AccidenteAtencion } from "./accidente-atencion"
import { AccidenteClasificacion } from "./accidente-clasificacion"
import { aDatos, errorDelPaso, formularioInicial, type FormularioAccidente, type Paso } from "./accidente-form"
import { EmpleadoSelect } from "./empleado-select"

const PASOS = ["Accidente", "Clasificación", "Atención"] as const
// Campo que recibe el foco al entrar a cada paso.
const PRIMER_CAMPO: Record<Paso, string> = { 1: "accidente-fecha", 2: "accidente-severidad-alta", 3: "accidente-atencion-0" }

/**
 * Registro o edición de un accidente en tres pasos: qué pasó, cómo se clasifica
 * (severidad, riesgo de trabajo e incapacidad, reporte) y dónde se atendió, con su seguimiento.
 */
export function AccidenteDialog({ accidente, fecha, onClose, onSave }: {
  /** Al editar, el accidente guardado; al crear, null. */
  accidente: Accidente | null
  /** Día propuesto al crear. */
  fecha: string
  onClose: () => void
  /** Guarda en la base; si falla, el error se muestra en el modal. */
  onSave: (datos: DatosAccidente) => Promise<void>
}) {
  const [step, setStep] = useState<Paso>(1)
  const [form, setForm] = useState<FormularioAccidente>(() => formularioInicial(accidente, fecha))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // Mientras guarda, el modal no se cierra.
  const cerrar = () => { if (!saving) onClose() }
  const titulo = accidente ? "Editar accidente" : "Registrar accidente"

  const isFirstRender = useRef(true)
  useEffect(() => {
    // El primer paso enfoca el título del modal (ResponsiveShell); los demás, su primer campo.
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    document.getElementById(PRIMER_CAMPO[step])?.focus()
  }, [step])

  function cambiar<K extends keyof FormularioAccidente>(key: K, value: FormularioAccidente[K]) {
    setForm(current => ({ ...current, [key]: value }))
    setError(null)
  }

  async function continuar() {
    if (saving) return
    const falta = errorDelPaso(form, step)
    if (falta) {
      setError(falta)
      return
    }
    if (step < 3) {
      setStep((step + 1) as Paso)
      return
    }
    if (!form.empleado || !form.severidad) return
    setSaving(true)
    try {
      await onSave(aDatos(form, form.empleado, form.severidad))
    } catch {
      setError("No se pudo guardar el accidente. Inténtalo de nuevo.")
      setSaving(false)
    }
  }

  return (
    <ResponsiveShell open onClose={cerrar} size="md" title={titulo}>
      <ModalHeader title={titulo} onClose={cerrar} />
      <form className="grid min-h-0 gap-5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5" onSubmit={event => { event.preventDefault(); void continuar() }}>
        <Stepper steps={PASOS} current={step} />

        {step === 1 && <>
          <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <div className={FIELD}>
              <Label htmlFor="accidente-fecha">Fecha</Label>
              <DateTextInput id="accidente-fecha" value={form.fecha} onValueChange={value => cambiar("fecha", value)} />
            </div>
            <div className={FIELD}>
              <Label htmlFor="accidente-colaborador">Colaborador <span className="font-normal text-muted-foreground">· por número de empleado</span></Label>
              <EmpleadoSelect id="accidente-colaborador" value={form.empleado} onChange={value => cambiar("empleado", value)} />
            </div>
          </div>
          <div className={FIELD}>
            <Label htmlFor="accidente-descripcion">¿Qué ocurrió?</Label>
            <Textarea id="accidente-descripcion" rows={3} value={form.descripcion} maxLength={DESCRIPCION_ACCIDENTE_MAX}
              className="min-h-20 resize-none field-sizing-content"
              onChange={event => cambiar("descripcion", event.target.value)} />
          </div>
        </>}

        {step === 2 && <AccidenteClasificacion form={form} cambiar={cambiar} />}
        {step === 3 && <AccidenteAtencion form={form} cambiar={cambiar} />}

        {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}
      </form>
      <ModalFooter onCancel={step === 1 ? cerrar : () => { setError(null); setStep((step - 1) as Paso) }}
        cancelLabel={step === 1 ? "Cancelar" : "Volver"}
        onConfirm={() => void continuar()} saving={saving} confirmLabel={step === 3 ? (accidente ? "Guardar cambios" : "Registrar") : "Continuar"} />
    </ResponsiveShell>
  )
}
