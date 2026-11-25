import { Checkbox } from "@/components/ui/checkbox"
import { ATENCIONES, SEGUIMIENTO, type AtencionAccidente } from "@/lib/salud-ocupacional"
import { cn } from "@/lib/utils"
import { ChoiceToggle } from "@/components/ui/choice-toggle"
import { CampoDias, FIELD } from "./accidente-campos"
import type { FormularioAccidente } from "./accidente-form"

type Cambiar = <K extends keyof FormularioAccidente>(key: K, value: FormularioAccidente[K]) => void

const GOCE = [{ value: "si", label: "Con goce" }, { value: "no", label: "Sin goce" }] as const
const CASILLA = "flex min-h-(--control-height) cursor-pointer items-center gap-3 text-body-md text-foreground"

/** Detalle que se abre al marcar una atención: reposo del servicio médico o pasos de clínica e IMSS. */
function DetalleAtencion({ atencion, form, cambiar }: { atencion: AtencionAccidente; form: FormularioAccidente; cambiar: Cambiar }) {
  if (atencion === "servicio_medico") {
    return <>
      <CampoDias id="accidente-dias-reposo" label="Días de reposo" hint="vacío si no hubo" value={form.diasReposo}
        onChange={value => cambiar("diasReposo", value)} />
      {form.diasReposo && (
        <ChoiceToggle id="accidente-goce" label="Goce de sueldo" value={form.goce} options={GOCE} onChange={value => cambiar("goce", value)} />
      )}
    </>
  }
  // En orden: un paso se habilita con el anterior y, al desmarcarlo, se limpian los que siguen.
  const pasos = SEGUIMIENTO[atencion] ?? []
  return pasos.map((paso, index) => {
    const bloqueado = index > 0 && !form[pasos[index - 1].key]
    return (
      <label key={paso.key} className={cn(CASILLA, bloqueado && "cursor-not-allowed text-muted-foreground")}>
        <Checkbox checked={form[paso.key]} disabled={bloqueado}
          onCheckedChange={checked => {
            cambiar(paso.key, checked === true)
            if (checked !== true) pasos.slice(index + 1).forEach(siguiente => cambiar(siguiente.key, false))
          }} />
        {paso.label}
      </label>
    )
  })
}

/** Paso 3: dónde se atendió; cada atención marcada abre su seguimiento debajo. */
export function AccidenteAtencion({ form, cambiar }: { form: FormularioAccidente; cambiar: Cambiar }) {
  return (
    <fieldset className={FIELD}>
      <legend className="mb-2 text-label-sm text-foreground">Atención recibida <span className="text-body-sm text-muted-foreground">· puede ser más de una, o ninguna</span></legend>
      <div className="grid gap-2">
        {ATENCIONES.map((atencion, index) => {
          const marcada = form.atenciones.includes(atencion.value)
          return (
            <div key={atencion.value} className={cn("rounded-md border", marcada ? "border-primary" : "border-border")}>
              <label className="flex min-h-(--control-height) cursor-pointer items-center gap-3 rounded-md px-3 text-body-md text-foreground hover:bg-muted">
                <Checkbox id={`accidente-atencion-${index}`} checked={marcada}
                  onCheckedChange={checked => cambiar("atenciones", checked === true
                    ? [...form.atenciones, atencion.value]
                    : form.atenciones.filter(item => item !== atencion.value))} />
                <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-sm", atencion.dot)} />
                <span className="min-w-0">{atencion.label}</span>
              </label>
              {marcada && (
                <div className="grid gap-3 border-t px-3 py-3 pl-10">
                  <DetalleAtencion atencion={atencion.value} form={form} cambiar={cambiar} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
