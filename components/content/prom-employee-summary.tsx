import type { EmpleadoPromocion } from "@/lib/promociones/types"

export function PromEmployeeSummary({ empleado }: { empleado: EmpleadoPromocion }) {
  const metadata = [empleado.numero && `#${empleado.numero}`, empleado.puesto].filter(Boolean).join(" · ")
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
      <p className="break-words text-label-sm text-foreground">{empleado.nombre}</p>
      {metadata && (
        <p className="mt-0.5 break-words text-body-sm tabular-nums text-muted-foreground">{metadata}</p>
      )}
    </div>
  )
}
