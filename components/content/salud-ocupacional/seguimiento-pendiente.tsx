import { CircleCheck } from "lucide-react"
import type { pendientesSeguimiento } from "@/lib/salud-ocupacional"
import { cn } from "@/lib/utils"

/**
 * Trámites abiertos de IMSS (ST7 → ST2) y clínica (requisición → pago) de todos los
 * meses. Solo se listan los renglones con casos; sin ninguno, un aviso corto.
 */
export function SeguimientoPendiente({ pendientes, className }: {
  pendientes: ReturnType<typeof pendientesSeguimiento>
  className?: string
}) {
  const abiertos = pendientes.filter(pendiente => pendiente.total > 0)
  return (
    <section aria-labelledby="pendientes-title" className={cn("grid content-start gap-2 rounded-xl border bg-card p-(--card-padding)", className)}>
      <h3 id="pendientes-title" className="text-label-sm text-foreground">Seguimiento pendiente</h3>
      {abiertos.length ? (
        <dl className="grid gap-1.5">
          {abiertos.map(pendiente => (
            <div key={pendiente.key} className="flex items-center gap-2 text-body-sm">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-chart-3" />
              <dt className="min-w-0 flex-1 truncate text-muted-foreground">{pendiente.label}</dt>
              <dd className="tabular-nums text-foreground">{pendiente.total}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
          <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-chart-1-deep" />Sin pendientes
        </p>
      )}
    </section>
  )
}
