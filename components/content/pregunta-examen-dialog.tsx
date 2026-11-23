"use client"

import { useEffect, useRef, useState } from "react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { Stepper } from "@/components/ui/stepper"
import type { PreguntaInsert } from "@/lib/hooks/useExamenes"
import { cn } from "@/lib/utils"

const PASOS = ["Pregunta", "Opciones", "Respuesta"] as const
type Paso = 1 | 2 | 3
const OPCIONES = [
  { value: "a", field: "opcion_a", label: "Opción A" },
  { value: "b", field: "opcion_b", label: "Opción B" },
  { value: "c", field: "opcion_c", label: "Opción C" },
] as const
// Campo que recibe el foco al entrar a cada paso.
const PRIMER_CAMPO: Record<Paso, string> = { 1: "pregunta-departamento", 2: "pregunta-opcion_a", 3: "pregunta-respuesta-a" }

interface PreguntaExamenDialogProps {
  /** Pregunta a editar; sin ella, se crea una nueva. */
  initial: PreguntaInsert | null
  departamentos: readonly string[]
  readOnly: boolean
  onClose: () => void
  onSave: (pregunta: PreguntaInsert) => Promise<void>
}

const EMPTY: PreguntaInsert = { departamento: "", pregunta: "", opcion_a: "", opcion_b: "", opcion_c: "", respuesta_correcta: "a" }

/** Asistente de 3 pasos para crear o editar una pregunta del banco. */
export function PreguntaExamenDialog({ initial, departamentos, readOnly, onClose, onSave }: PreguntaExamenDialogProps) {
  const editing = initial !== null
  const title = editing ? "Editar pregunta" : "Nueva pregunta"
  const [step, setStep] = useState<Paso>(1)
  const [form, setForm] = useState<PreguntaInsert>(initial ?? EMPTY)
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

  const update = (field: keyof PreguntaInsert, value: string) => {
    setForm(current => ({ ...current, [field]: value }))
    setError(null)
  }

  const goTo = (next: Paso) => { setError(null); setStep(next) }

  const handleContinue = () => {
    if (step === 1) {
      if (!form.departamento || !form.pregunta.trim()) return setError("Elige el departamento y escribe la pregunta.")
      return goTo(2)
    }
    if (OPCIONES.some(({ field }) => !form[field].trim())) return setError("Escribe las tres opciones.")
    goTo(3)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la pregunta.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveShell open onClose={onClose} size="md" title={title}>
      <ModalHeader title={title} onClose={onClose} />
      <div className="grid min-h-0 gap-5 overflow-y-auto p-(--card-padding)">
        <Stepper steps={PASOS} current={step} />

        {step === 1 && <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pregunta-departamento">Departamento</Label>
            <Select value={form.departamento} onValueChange={value => update("departamento", value)}>
              <SelectTrigger id="pregunta-departamento"><SelectValue placeholder="Selecciona un departamento" /></SelectTrigger>
              <SelectContent>
                {departamentos.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pregunta-texto">Pregunta</Label>
            <Textarea id="pregunta-texto" rows={3} placeholder="Escribe la pregunta…" value={form.pregunta}
              onChange={event => update("pregunta", event.target.value)} />
          </div>
        </div>}

        {step === 2 && <div className="grid gap-4">
          {OPCIONES.map(({ field, label }) => (
            <div key={field} className="space-y-1.5">
              <Label htmlFor={`pregunta-${field}`}>{label}</Label>
              <Textarea id={`pregunta-${field}`} rows={2} placeholder={`Texto de la ${label.toLowerCase()}`} value={form[field]}
                onChange={event => update(field, event.target.value)} />
            </div>
          ))}
        </div>}

        {step === 3 && <fieldset className="grid gap-3">
          <legend className="mb-3 text-body-md text-foreground">{form.pregunta}</legend>
          <p className="text-label-sm text-muted-foreground">Elige la respuesta correcta</p>
          <RadioGroup value={form.respuesta_correcta} onValueChange={value => update("respuesta_correcta", value)}>
            {OPCIONES.map(({ value, field, label }) => {
              const checked = form.respuesta_correcta === value
              return (
                <Label key={value} htmlFor={`pregunta-respuesta-${value}`}
                  className={cn("flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors hover:bg-muted/50",
                    checked && "border-primary bg-muted/50")}>
                  <RadioGroupItem id={`pregunta-respuesta-${value}`} value={value} className="mt-0.5" />
                  <span className="min-w-0 space-y-0.5">
                    <span className="block text-label-sm text-foreground">{label}</span>
                    <span className="block break-words text-body-sm font-normal text-muted-foreground">{form[field]}</span>
                  </span>
                </Label>
              )
            })}
          </RadioGroup>
        </fieldset>}

        {error && <p role="alert" className="-mt-2 text-body-sm text-destructive">{error}</p>}
      </div>
      <ModalFooter onCancel={step === 1 ? onClose : () => goTo(step === 3 ? 2 : 1)}
        cancelLabel={step === 1 ? "Cancelar" : "Volver"}
        onConfirm={step === 3 ? handleSave : handleContinue}
        confirmLabel={step === 3 ? (editing ? "Guardar cambios" : "Guardar pregunta") : "Continuar"}
        saving={saving} confirmDisabled={step === 3 && readOnly} />
    </ResponsiveShell>
  )
}
