import { ChevronRight, CircleCheck, CircleDashed } from "lucide-react"
import type { ReactNode } from "react"
import { formatDiaCompleto } from "@/components/ui/month-calendar"
import { SideDetailPanel } from "@/components/ui/side-detail-panel"
import { ATENCIONES, SEGUIMIENTO, SEVERIDADES, type Accidente } from "@/lib/salud-ocupacional"
import { cn } from "@/lib/utils"

const EYEBROW = "text-eyebrow uppercase text-muted-foreground"
const SECCION = "grid gap-2 border-t px-(--card-padding) py-4"
const dias = (count: number) => `${count} ${count === 1 ? "día" : "días"}`

/** Dato corto del resumen: etiqueta arriba, valor abajo. */
function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-1">
      <dt className={EYEBROW}>{label}</dt>
      <dd className="flex min-w-0 items-center gap-2 text-body-md text-foreground">{children}</dd>
    </div>
  )
}

function incapacidadTexto(accidente: Accidente) {
  if (!accidente.riesgoTrabajo) return <span className="text-muted-foreground">No aplica</span>
  if (accidente.incapacidad && accidente.diasIncapacidad) return dias(accidente.diasIncapacidad)
  return accidente.incapacidad === false ? "Sin incapacidad" : <span className="text-muted-foreground">Sin registrar</span>
}

/** Una atención con su seguimiento: reposo del servicio médico o pasos en orden (ST7 → ST2, requisición → pago). */
function AtencionCard({ atencion, accidente }: { atencion: (typeof ATENCIONES)[number]; accidente: Accidente }) {
  const pasos = SEGUIMIENTO[atencion.value] ?? []
  const hechos = pasos.filter(paso => accidente[paso.key]).length
  return (
    <li className="grid gap-2 rounded-md border p-3">
      <div className="flex items-center gap-2">
        <atencion.icon aria-hidden="true" className={cn("size-4 shrink-0", atencion.text)} />
        <p className="min-w-0 flex-1 truncate text-label-sm text-foreground">{atencion.label}</p>
        {pasos.length > 0 && (
          <span className={cn("shrink-0 text-body-sm tabular-nums", hechos === pasos.length ? "text-chart-1-deep" : "text-muted-foreground")}>
            {hechos === pasos.length ? "Completo" : `${hechos} de ${pasos.length}`}
          </span>
        )}
      </div>
      {atencion.value === "servicio_medico" ? (
        <p className="text-body-sm text-muted-foreground">
          {accidente.diasReposo ? `${dias(accidente.diasReposo)} de reposo · ${accidente.reposoConGoce ? "con" : "sin"} goce de sueldo` : "Sin días de reposo"}
        </p>
      ) : (
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {pasos.map((paso, index) => {
            const hecho = accidente[paso.key]
            const Icono = hecho ? CircleCheck : CircleDashed
            return (
              <li key={paso.key} className={cn("flex items-center gap-1.5 text-body-sm", hecho ? "text-foreground" : "text-muted-foreground")}>
                {index > 0 && <ChevronRight aria-hidden="true" className="mr-0.5 size-3.5 shrink-0 text-muted-foreground" />}
                <Icono aria-hidden="true" className={cn("size-4 shrink-0", hecho && "text-chart-1-deep")} />
                {paso.label}
                <span className="sr-only">{hecho ? ", cumplido" : ", pendiente"}</span>
              </li>
            )
          })}
        </ol>
      )}
    </li>
  )
}

/** Detalle de solo lectura junto a la tabla del día (hoja inferior en pantallas chicas), como en Safe Walk; editar va en el menú de la fila. */
export function AccidentePanel({ accidente, side, onClose }: {
  accidente: Accidente
  side: boolean
  onClose: () => void
}) {
  const atenciones = ATENCIONES.filter(atencion => accidente.atenciones.includes(atencion.value))
  const severidad = SEVERIDADES.find(item => item.value === accidente.severidad)
  return (
    <SideDetailPanel side={side} title={`Accidente de ${accidente.colaborador}`} description="Detalle del accidente" onClose={onClose}>
      <header className="grid gap-1 p-(--card-padding) pr-14">
        <p className="text-body-sm tabular-nums text-muted-foreground">#{accidente.numeroEmpleado} · {formatDiaCompleto(accidente.fecha)}</p>
        <h2 className="break-words text-heading-md text-foreground">{accidente.colaborador}</h2>
      </header>

      {/* Resumen en dos columnas: lo que se busca primero, antes del relato. */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t px-(--card-padding) py-4">
        <Dato label="Severidad">
          {severidad && <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-sm", severidad.dot)} />}
          {severidad?.label ?? <span className="text-muted-foreground">Sin registrar</span>}
        </Dato>
        <Dato label="Reporte">
          {accidente.reporteGenerado ? "Generado" : <span className="text-warning-deep">Pendiente</span>}
        </Dato>
        <Dato label="Riesgo de trabajo">{accidente.riesgoTrabajo ? "Sí" : "No"}</Dato>
        <Dato label="Incapacidad">{incapacidadTexto(accidente)}</Dato>
      </dl>

      <section aria-labelledby="accidente-relato-title" className={SECCION}>
        <h3 id="accidente-relato-title" className={EYEBROW}>¿Qué ocurrió?</h3>
        <p className="whitespace-pre-wrap break-words text-body-md text-foreground">{accidente.descripcion}</p>
      </section>

      <section aria-labelledby="accidente-atencion-title" className={SECCION}>
        <h3 id="accidente-atencion-title" className={EYEBROW}>Atención recibida</h3>
        {atenciones.length
          ? <ul className="grid gap-2">{atenciones.map(atencion => <AtencionCard key={atencion.value} atencion={atencion} accidente={accidente} />)}</ul>
          : <p className="text-body-md text-muted-foreground">Sin atención</p>}
      </section>
    </SideDetailPanel>
  )
}
