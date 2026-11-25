import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DIAS_MAX } from "@/lib/salud-ocupacional"
import { cn } from "@/lib/utils"

/** Piezas compartidas por los pasos del modal de accidente. */
export const FIELD = "grid min-w-0 content-start gap-2"
const OPCION = "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border px-3 text-body-md text-foreground hover:bg-muted has-[[data-state=checked]]:border-primary"
/** Pregunta que depende de la anterior: sangrada bajo ella, con una línea guía. */
export const ANIDADO = "grid gap-4 border-l-2 border-border pl-4"

export const SI_NO = [{ value: "si", label: "Sí" }, { value: "no", label: "No" }] as const

/** Pregunta de opción única con opciones del mismo alto que los campos. */
export function PreguntaOpciones<T extends string>({ id, label, value, options, onChange }: {
  id: string
  label: string
  value: T | ""
  options: readonly { value: T; label: string; dot?: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-labelledby={`${id}-label`} className={FIELD}>
      <p id={`${id}-label`} className="text-label-sm text-foreground">{label}</p>
      <RadioGroup value={value} onValueChange={next => onChange(next as T)} aria-labelledby={`${id}-label`}
        className={cn("grid gap-2", options.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {options.map(option => (
          <label key={option.value} htmlFor={`${id}-${option.value}`} className={OPCION}>
            <RadioGroupItem id={`${id}-${option.value}`} value={option.value} />
            {option.dot && <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", option.dot)} />}
            {option.label}
          </label>
        ))}
      </RadioGroup>
    </div>
  )
}

/** Días (1 a 365): solo dígitos, sin flechas de número nativas. */
export function CampoDias({ id, label, hint, value, onChange }: {
  id: string
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className={FIELD}>
      <Label htmlFor={id}>{label}{hint && <span className="font-normal text-muted-foreground"> · {hint}</span>}</Label>
      <Input id={id} inputMode="numeric" autoComplete="off" maxLength={String(DIAS_MAX).length} className="w-24 tabular-nums"
        value={value} onChange={event => onChange(event.target.value.replace(/\D/g, ""))} />
    </div>
  )
}
