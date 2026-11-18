import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { MESES } from "@/lib/plan-anual"
import { nombreEquipoDnc, type AutorizacionDnc, type DatosNecesidad, type DncCourse, type DncPosition } from "@/lib/dnc"

interface StepProps {
  form: DatosNecesidad
  onChange: (field: keyof DatosNecesidad, value: string | number) => void
}

interface IdentityStepProps extends StepProps {
  cursos: DncCourse[]
  cursosLoading: boolean
  cursosError: string | null
  puestos: DncPosition[]
  departmentName: string
  onPositionsChange: (positionIds: string[]) => void
}

// Crecen con el contenido (sin scroll interno); `rows` es el respaldo donde field-sizing no existe.
const AUTO_TEXTAREA = "min-h-11 resize-none field-sizing-content"
const FIELD = "grid min-w-0 content-start gap-2"

export function DncNeedIdentityStep({ form, onChange, cursos, cursosLoading, cursosError, puestos, departmentName, onPositionsChange }: IdentityStepProps) {
  const selectedCount = puestos.filter(puesto => form.position_ids.includes(puesto.id)).length
  const allSelected = puestos.length > 0 && selectedCount === puestos.length

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={FIELD}>
          <Label htmlFor="dnc-necesidad">Necesidad identificada</Label>
          <Textarea id="dnc-necesidad" rows={1} className={AUTO_TEXTAREA} value={form.necesidad}
            onChange={event => onChange("necesidad", event.target.value)} maxLength={1000} />
        </div>
        <div className={FIELD}>
          <Label htmlFor="dnc-curso">Curso</Label>
          {cursosLoading ? <Skeleton className="h-11 w-full" /> : (
            <Select value={form.course_id ?? ""} onValueChange={value => onChange("course_id", value)}>
              <SelectTrigger id="dnc-curso" disabled={Boolean(cursosError) || cursos.length === 0}>
                <SelectValue placeholder="Selecciona un curso" />
              </SelectTrigger>
              <SelectContent matchTriggerWidth className="max-h-60">
                {cursos.map(curso => <SelectItem key={curso.id} value={curso.id}>{curso.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {!cursosLoading && !cursosError && cursos.length === 0 && (
            <p className="text-body-sm text-muted-foreground">No hay cursos en Plantilla.</p>
          )}
          {cursosError && <p role="alert" className="text-body-sm text-destructive">{cursosError}</p>}
        </div>
      </div>

      <div role="group" aria-labelledby="dnc-puestos-label" className="grid min-w-0 gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4">
          <p id="dnc-puestos-label" className="text-label-sm text-foreground">
            Puestos <span className="text-body-sm text-muted-foreground">· {selectedCount} de {puestos.length}</span>
          </p>
          {puestos.length > 0 && (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-body-md text-foreground">
              <Checkbox checked={allSelected ? true : selectedCount > 0 ? "indeterminate" : false}
                onCheckedChange={checked => onPositionsChange(checked === true ? puestos.map(puesto => puesto.id) : [])} />
              Todos
              <span className="text-body-sm text-muted-foreground">{nombreEquipoDnc(departmentName)}</span>
            </label>
          )}
        </div>
        {puestos.length ? (
          <div className="grid gap-x-4 border-t border-border pt-1 sm:grid-cols-2 lg:grid-cols-3">
            {puestos.map(puesto => (
              <label key={puesto.id} className="flex min-h-11 min-w-0 cursor-pointer items-center gap-3 rounded-md px-2 text-body-md text-foreground hover:bg-muted">
                <Checkbox checked={form.position_ids.includes(puesto.id)}
                  onCheckedChange={checked => onPositionsChange(checked === true
                    ? [...form.position_ids, puesto.id]
                    : form.position_ids.filter(id => id !== puesto.id))} />
                <span className="truncate" title={puesto.name}>{puesto.name}</span>
              </label>
            ))}
          </div>
        ) : <p className="text-body-sm text-muted-foreground">No hay puestos en este departamento.</p>}
      </div>
    </div>
  )
}

export function DncNeedDetailsStep({ form, onChange }: StepProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className={FIELD}>
        <Label htmlFor="dnc-funcion">Función o actividad relacionada</Label>
        <Textarea id="dnc-funcion" rows={3} className={AUTO_TEXTAREA} value={form.funcion_actividad}
          onChange={event => onChange("funcion_actividad", event.target.value)} maxLength={1000} />
      </div>
      <div className={FIELD}>
        <Label htmlFor="dnc-motivo">Motivo de la necesidad</Label>
        <Textarea id="dnc-motivo" rows={3} className={AUTO_TEXTAREA} value={form.motivo}
          onChange={event => onChange("motivo", event.target.value)} maxLength={1000} />
      </div>
      <div className={`${FIELD} sm:col-span-2`}>
        <Label htmlFor="dnc-beneficio">Beneficio para el área o empresa</Label>
        <Textarea id="dnc-beneficio" rows={2} className={AUTO_TEXTAREA} value={form.beneficio}
          onChange={event => onChange("beneficio", event.target.value)} maxLength={1000} />
      </div>
      <div className={FIELD}>
        <Label htmlFor="dnc-mes">Mes sugerido</Label>
        <Select value={String(form.mes_sugerido)} onValueChange={value => onChange("mes_sugerido", Number(value))}>
          <SelectTrigger id="dnc-mes"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-60">
            {MESES.map((mes, index) => <SelectItem key={mes} value={String(index + 1)}>{mes}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className={FIELD}>
        <Label htmlFor="dnc-tipo">Tipo de capacitación</Label>
        <Select value={form.tipo} onValueChange={value => onChange("tipo", value)}>
          <SelectTrigger id="dnc-tipo"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="interno">Interna</SelectItem>
            <SelectItem value="externo">Externa</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

const OPCIONES_AUTORIZACION: { value: AutorizacionDnc; label: string }[] = [
  { value: "autorizado", label: "Autorizada" },
  { value: "no_autorizado", label: "No autorizada" },
]

export function DncNeedAuthorizationStep({ form, onChange }: StepProps) {
  return (
    <div className="grid gap-4">
      <div role="group" aria-labelledby="dnc-autorizacion-label" className="grid gap-2">
        <p id="dnc-autorizacion-label" className="text-label-sm text-foreground">Autorización</p>
        <RadioGroup value={form.autorizacion ?? ""} onValueChange={value => onChange("autorizacion", value)}
          aria-labelledby="dnc-autorizacion-label" className="grid gap-2 sm:grid-cols-2">
          {OPCIONES_AUTORIZACION.map(opcion => (
            <label key={opcion.value} htmlFor={`dnc-autorizacion-${opcion.value}`}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border px-3 text-body-md text-foreground hover:bg-muted has-[[data-state=checked]]:border-primary">
              <RadioGroupItem id={`dnc-autorizacion-${opcion.value}`} value={opcion.value} />
              {opcion.label}
            </label>
          ))}
        </RadioGroup>
      </div>
      {form.autorizacion === "no_autorizado" && (
        <div className={FIELD}>
          <Label htmlFor="dnc-motivo-no-autorizado">Motivo de no autorización</Label>
          <Textarea id="dnc-motivo-no-autorizado" rows={3} className={AUTO_TEXTAREA}
            value={form.motivo_no_autorizado ?? ""}
            onChange={event => onChange("motivo_no_autorizado", event.target.value)} maxLength={1000} />
        </div>
      )}
    </div>
  )
}
