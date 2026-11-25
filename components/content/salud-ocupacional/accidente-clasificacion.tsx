import { SEVERIDADES } from "@/lib/salud-ocupacional"
import { ANIDADO, CampoDias, PreguntaOpciones, SI_NO } from "./accidente-campos"
import type { FormularioAccidente } from "./accidente-form"

type Cambiar = <K extends keyof FormularioAccidente>(key: K, value: FormularioAccidente[K]) => void

/** Paso 2: severidad, riesgo de trabajo (con incapacidad y sus días) y reporte de incidente. */
export function AccidenteClasificacion({ form, cambiar }: { form: FormularioAccidente; cambiar: Cambiar }) {
  return (
    <div className="grid gap-4">
      <PreguntaOpciones id="accidente-severidad" label="Severidad" value={form.severidad} options={SEVERIDADES}
        onChange={value => cambiar("severidad", value)} />
      <PreguntaOpciones id="accidente-riesgo" label="¿Fue riesgo de trabajo?" value={form.riesgo} options={SI_NO}
        onChange={value => cambiar("riesgo", value)} />
      {form.riesgo === "si" && (
        <div className={ANIDADO}>
          <PreguntaOpciones id="accidente-incapacidad" label="¿Hubo incapacidad?" value={form.incapacidad} options={SI_NO}
            onChange={value => cambiar("incapacidad", value)} />
          {form.incapacidad === "si" && (
            <CampoDias id="accidente-dias-incapacidad" label="Días de incapacidad" value={form.diasIncapacidad}
              onChange={value => cambiar("diasIncapacidad", value)} />
          )}
        </div>
      )}
      <PreguntaOpciones id="accidente-reporte" label="¿Se generó el reporte de incidente?" value={form.reporte} options={SI_NO}
        onChange={value => cambiar("reporte", value)} />
    </div>
  )
}
