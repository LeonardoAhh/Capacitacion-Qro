import { ChevronRight, CircleCheck, CircleDashed } from "lucide-react"
import type { ReactNode } from "react"
import { FloatingDetailPanel, type FloatingDetailNavigation } from "@/components/ui/floating-detail-panel"
import { formatDiaCompleto } from "@/components/ui/month-calendar"
import { ATENCIONES, SEGUIMIENTO, SEVERIDADES, type Accidente, type AtencionAccidente, type Severidad } from "@/lib/salud-ocupacional"
import { cn } from "@/lib/utils"

const EYEBROW = "text-eyebrow uppercase text-muted-foreground"
const dias = (count: number) => `${count} ${count === 1 ? "día" : "días"}`

const SEVERIDAD_TEXTO: Record<Severidad, string> = {
  alta: "text-destructive",
  media: "text-warning-deep",
  baja: "text-chart-1-deep",
}

const ATENCION_FONDO: Record<AtencionAccidente, string> = {
  servicio_medico: "bg-chart-2/10",
  clinica_particular: "bg-chart-4/10",
  imss: "bg-chart-5/10",
}

/** Dato corto del resumen: etiqueta arriba, valor abajo. */
function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-1">
      <dt className={EYEBROW}>{label}</dt>
      <dd className="flex min-w-0 items-center gap-2 text-label-sm text-foreground">{children}</dd>
    </div>
  )
}

function incapacidadTexto(accidente: Accidente) {
  if (!accidente.riesgoTrabajo) return "No aplica"
  if (accidente.incapacidad && accidente.diasIncapacidad) return <span className="tabular-nums">{dias(accidente.diasIncapacidad)}</span>
  return accidente.incapacidad === false ? "Sin incapacidad" : <span className="font-normal text-muted-foreground">Sin registrar</span>
}

/** Atención plana sin tarjeta anidada: ícono tintado a la izquierda y seguimiento o reposo a la derecha. */
function AtencionItem({ atencion, accidente }: { atencion: (typeof ATENCIONES)[number]; accidente: Accidente }) {
  const pasos = SEGUIMIENTO[atencion.value] ?? []
  const hechos = pasos.filter(paso => accidente[paso.key]).length
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className={cn("grid size-9 shrink-0 place-items-center rounded-md", ATENCION_FONDO[atencion.value], atencion.text)}
      >
        <atencion.icon className="size-4" />
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-label-sm text-foreground">{atencion.label}</p>
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
      </div>
    </li>
  )
}

/**
 * Detalle de solo lectura en el panel flotante centrado sobre la tabla del día (hoja inferior en
 * celular), como en Safe Walk; ‹ › recorre los accidentes del día. Editar va en el menú de la fila.
 */
export function AccidentePanel({ accidente, navigation, onClose }: {
  accidente: Accidente
  navigation: FloatingDetailNavigation
  onClose: () => void
}) {
  const atenciones = ATENCIONES.filter(atencion => accidente.atenciones.includes(atencion.value))
  const severidad = SEVERIDADES.find(item => item.value === accidente.severidad)

  return (
    <FloatingDetailPanel
      title={`Accidente de ${accidente.colaborador}`}
      description="Detalle del accidente"
      onClose={onClose}
      navigation={navigation}
      header={
        <div className="grid gap-1">
          <p className="text-body-sm tabular-nums text-muted-foreground">
            #{accidente.numeroEmpleado} · {formatDiaCompleto(accidente.fecha)}
          </p>
          <h2 className="break-words text-heading-md text-foreground sm:text-heading-lg">{accidente.colaborador}</h2>
          <p className={cn(
            "mt-1 inline-flex items-center gap-2 text-body-sm font-medium",
            severidad ? SEVERIDAD_TEXTO[severidad.value] : "font-normal text-muted-foreground",
          )}>
            {severidad && <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-sm", severidad.dot)} />}
            {severidad ? `Severidad ${severidad.label.toLowerCase()}` : "Severidad sin registrar"}
          </p>
        </div>
      }
    >
      <div className="space-y-6 px-(--card-padding) pb-(--card-padding)">
        {/* Franja de 3 datos clave enmarcada por dos hairlines interiores. */}
        <dl className="grid grid-cols-1 gap-3 border-y border-border py-4 sm:grid-cols-3 sm:gap-4">
          <Dato label="Riesgo de trabajo">{accidente.riesgoTrabajo ? "Sí" : "No"}</Dato>
          <Dato label="Reporte">
            {accidente.reporteGenerado ? "Generado" : <span className="text-warning-deep">Pendiente</span>}
          </Dato>
          <Dato label="Incapacidad">{incapacidadTexto(accidente)}</Dato>
        </dl>

        <section aria-labelledby="accidente-relato-title" className="space-y-2">
          <h3 id="accidente-relato-title" className={EYEBROW}>¿Qué ocurrió?</h3>
          <p className="whitespace-pre-wrap break-words text-body-md text-foreground">{accidente.descripcion}</p>
        </section>

        <section aria-labelledby="accidente-atencion-title" className="space-y-3">
          <h3 id="accidente-atencion-title" className={EYEBROW}>Atención recibida</h3>
          {atenciones.length ? (
            <ul className="grid gap-3">
              {atenciones.map(atencion => <AtencionItem key={atencion.value} atencion={atencion} accidente={accidente} />)}
            </ul>
          ) : (
            <p className="text-body-md text-muted-foreground">Sin atención</p>
          )}
        </section>
      </div>
    </FloatingDetailPanel>
  )
}
