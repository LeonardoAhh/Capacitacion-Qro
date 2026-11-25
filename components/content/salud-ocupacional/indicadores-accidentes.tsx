import { Flame } from "lucide-react"
import { Card } from "@/components/ui/card"
import { MESES } from "@/lib/plan-anual"
import { formatFechaCorta } from "@/lib/fechas"
import { META_INCIDENTES_MES, TONO_RACHA, TONO_RIESGO, type pendientesSeguimiento, type racha, type resumenMes } from "@/lib/salud-ocupacional"
import { cn } from "@/lib/utils"
import { SeguimientoPendiente } from "./seguimiento-pendiente"

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export function IndicadoresAccidentes({ rachaActual, resumen, mes, pendientes }: {
  rachaActual: ReturnType<typeof racha>
  resumen: ReturnType<typeof resumenMes>
  mes: string
  pendientes: ReturnType<typeof pendientesSeguimiento>
}) {
  const nombreMes = MESES[Number(mes.slice(5, 7)) - 1]
  const avance = Math.min(1, resumen.total / META_INCIDENTES_MES)
  const clasificados = resumen.porSeveridad.reduce((total, severidad) => total + severidad.total, 0)
  const desglose: { label: string; total: number; dot?: string }[] = [
    { label: "Riesgo de trabajo", total: resumen.riesgosTrabajo, dot: TONO_RIESGO.dot },
    { label: "Días de incapacidad", total: resumen.diasIncapacidad },
    ...resumen.porAtencion.map(atencion => ({ label: atencion.label, total: atencion.total, dot: atencion.dot })),
  ]

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)]">
      <Card className="p-(--card-padding)">
        <section aria-labelledby="racha-title" className="grid content-start gap-1">
          <h2 id="racha-title" className="flex items-center gap-2 text-label-sm text-foreground">
            <span aria-hidden="true" className={cn("grid size-7 place-items-center rounded-md", TONO_RACHA.fondo, TONO_RACHA.texto)}><Flame className="size-4" /></span>
            Racha sin incidentes
          </h2>
          <p className="flex items-baseline gap-2">
            <span className={cn("text-heading-xl tabular-nums", TONO_RACHA.texto)}>{rachaActual.actual}</span>
            <span className="text-body-md text-muted-foreground">{rachaActual.actual === 1 ? "día" : "días"}</span>
          </p>
          <p className="text-body-sm text-muted-foreground">
            Desde {formatFechaCorta(rachaActual.desde)} · Mejor del año: {plural(rachaActual.mejor, "día", "días")}
          </p>
        </section>
      </Card>

      <Card className="p-(--card-padding)">
        <section aria-labelledby="meta-title" className="grid content-start gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="meta-title" className="text-label-sm text-foreground">Meta de {nombreMes.toLocaleLowerCase("es-MX")}</h2>
            <p className={cn("text-label-sm tabular-nums", resumen.dentroDeMeta ? "text-foreground" : "text-destructive")}>
              {resumen.total} de {META_INCIDENTES_MES}
            </p>
          </div>
          <div role="meter" aria-labelledby="meta-title" aria-valuemin={0} aria-valuemax={META_INCIDENTES_MES} aria-valuenow={resumen.total}
            className="h-2 overflow-hidden rounded-sm bg-muted">
            <div className={cn("h-full rounded-sm transition-[width] motion-reduce:transition-none", resumen.dentroDeMeta ? TONO_RACHA.barra : "bg-destructive")}
              style={{ width: `${avance * 100}%` }} />
          </div>
          <p className="text-body-sm text-muted-foreground">
            {resumen.dentroDeMeta ? `Máximo ${plural(META_INCIDENTES_MES, "incidente", "incidentes")} por mes.` : "Se superó la meta del mes."}
          </p>
        </section>
      </Card>

      <Card className="p-(--card-padding)">
        <section aria-labelledby="desglose-title" className="grid content-start gap-3">
          <h2 id="desglose-title" className="text-label-sm text-foreground">Detalle de {nombreMes.toLocaleLowerCase("es-MX")}</h2>
          <div className="grid gap-1.5">
            <div role="img" aria-label={`Severidad: ${resumen.porSeveridad.map(severidad => `${severidad.label} ${severidad.total}`).join(", ")}`}
              className="flex h-2 gap-0.5 overflow-hidden rounded-sm bg-muted">
              {clasificados > 0 && resumen.porSeveridad.filter(severidad => severidad.total > 0).map(severidad => (
                <span key={severidad.value} className={severidad.dot} style={{ width: `${(severidad.total / clasificados) * 100}%` }} />
              ))}
            </div>
            <ul aria-hidden="true" className="flex flex-wrap justify-between gap-2 text-body-sm text-muted-foreground">
              {resumen.porSeveridad.map(severidad => (
                <li key={severidad.value} className="flex items-center gap-1.5">
                  <span className={cn("size-2 shrink-0 rounded-sm", severidad.dot)} />
                  {severidad.label} <span className="tabular-nums text-foreground">{severidad.total}</span>
                </li>
              ))}
            </ul>
          </div>
          <dl className="grid gap-1.5 border-t pt-3">
            {desglose.map(item => (
              <div key={item.label} className="flex items-center gap-2 text-body-sm">
                <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-sm", item.dot)} />
                <dt className="min-w-0 flex-1 truncate text-muted-foreground">{item.label}</dt>
                <dd className="tabular-nums text-foreground">{item.total}</dd>
              </div>
            ))}
          </dl>
        </section>
      </Card>

      <SeguimientoPendiente pendientes={pendientes} />
    </div>
  )
}
