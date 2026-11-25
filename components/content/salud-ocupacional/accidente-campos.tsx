import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DIAS_MAX } from "@/lib/salud-ocupacional"

/** Piezas compartidas por los pasos del modal de accidente. */
export const FIELD = "grid min-w-0 content-start gap-2"
/** Pregunta que depende de la anterior: sangrada bajo ella, con una línea guía. */
export const ANIDADO = "grid gap-4 border-l-2 border-border pl-4"

export const SI_NO = [{ value: "si", label: "Sí" }, { value: "no", label: "No" }] as const

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
