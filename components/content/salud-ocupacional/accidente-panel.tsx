import { CircleCheck, CircleDashed } from "lucide-react"
import { formatDiaCompleto } from "@/components/ui/month-calendar"
import { SideDetailPanel } from "@/components/ui/side-detail-panel"
import { ATENCIONES, SEGUIMIENTO, SEVERIDADES, TONO_RIESGO, type Accidente, type AtencionAccidente } from "@/lib/salud-ocupacional"
import { cn } from "@/lib/utils"

const CHIP = "inline-flex items-center rounded-md border px-1.5 py-0.5 text-body-sm"
const DT = "text-label-sm text-muted-foreground"
const DD = "text-body-md text-foreground"
const dias = (count: number) => `${count} ${count === 1 ? "día" : "días"}`

function riesgoTexto(accidente: Accidente) {
  if (!accidente.riesgoTrabajo) return "No"
  if (accidente.incapacidad && accidente.diasIncapacidad) return `Sí · ${dias(accidente.diasIncapacidad)} de incapacidad`
  return accidente.incapacidad === false ? "Sí · sin incapacidad" : "Sí"
}

/** Seguimiento de una atención: reposo del servicio médico o pasos cumplidos de clínica e IMSS. */
function SeguimientoAtencion({ atencion, accidente }: { atencion: AtencionAccidente; accidente: Accidente }) {
  if (atencion === "servicio_medico") {
    return <p className="text-body-sm text-muted-foreground">
      {accidente.diasReposo ? `${dias(accidente.diasReposo)} de reposo ${accidente.reposoConGoce ? "con" : "sin"} goce de sueldo` : "Sin días de reposo"}
    </p>
  }
  return (
    <ul className="grid gap-1">
      {(SEGUIMIENTO[atencion] ?? []).map(paso => {
        const hecho = accidente[paso.key]
        const Icono = hecho ? CircleCheck : CircleDashed
        return (
          <li key={paso.key} className={cn("flex items-center gap-2 text-body-sm", hecho ? "text-foreground" : "text-muted-foreground")}>
            <Icono aria-hidden="true" className={cn("size-4 shrink-0", hecho ? "text-chart-1-deep" : "text-muted-foreground")} />
            {paso.label}
            <span className="sr-only">{hecho ? ", cumplido" : ", pendiente"}</span>
          </li>
        )
      })}
    </ul>
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
      <div className="grid gap-4 p-(--card-padding) pr-14">
        <div className="grid gap-1">
          <p className="text-body-sm tabular-nums text-muted-foreground">#{accidente.numeroEmpleado} · {formatDiaCompleto(accidente.fecha)}</p>
          <h2 className="break-words text-heading-md text-foreground">{accidente.colaborador}</h2>
        </div>
        <div className="flex flex-wrap gap-1">
          {accidente.riesgoTrabajo && <span className={cn(CHIP, TONO_RIESGO.chip)}>Riesgo de trabajo</span>}
          {atenciones.map(atencion => <span key={atencion.value} className={cn(CHIP, atencion.chip)}>{atencion.label}</span>)}
        </div>
      </div>
      <dl className="grid gap-4 border-t px-(--card-padding) py-4">
        <div className="grid gap-1">
          <dt className={DT}>¿Qué ocurrió?</dt>
          <dd className="whitespace-pre-wrap break-words text-body-md text-foreground">{accidente.descripcion}</dd>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1">
            <dt className={DT}>Severidad</dt>
            <dd className={cn(DD, "flex items-center gap-2")}>
              {severidad && <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", severidad.dot)} />}
              {severidad?.label ?? "Sin registrar"}
            </dd>
          </div>
          <div className="grid gap-1">
            <dt className={DT}>Reporte de incidente</dt>
            <dd className={DD}>{accidente.reporteGenerado ? "Generado" : "Pendiente"}</dd>
          </div>
        </div>
        <div className="grid gap-1">
          <dt className={DT}>Riesgo de trabajo</dt>
          <dd className={DD}>{riesgoTexto(accidente)}</dd>
        </div>
      </dl>
      <section aria-labelledby="accidente-atencion-title" className="grid gap-3 border-t px-(--card-padding) py-4">
        <h3 id="accidente-atencion-title" className={DT}>Atención recibida</h3>
        {atenciones.length ? (
          <ul className="grid gap-3">
            {atenciones.map(atencion => (
              <li key={atencion.value} className="grid gap-1.5">
                <p className="flex items-center gap-2 text-body-md text-foreground">
                  <atencion.icon aria-hidden="true" className={cn("size-4 shrink-0", atencion.text)} />
                  {atencion.label}
                </p>
                <div className="pl-6"><SeguimientoAtencion atencion={atencion.value} accidente={accidente} /></div>
              </li>
            ))}
          </ul>
        ) : <p className={DD}>Sin atención</p>}
      </section>
    </SideDetailPanel>
  )
}
