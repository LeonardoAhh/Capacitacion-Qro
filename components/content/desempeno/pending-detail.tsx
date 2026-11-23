"use client";

import { useId } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { type EmployeePending } from "@/lib/hooks/usePendingEvals";
import { formatDate } from "@/lib/hooks/useNuevoIngreso";
import { dias } from "@/lib/desempeno/pending-status";
import { estadoVentanaEvaluacion } from "@/lib/desempeno/hitos-nuevo-ingreso";
import { pendingEvalStatus } from "@/lib/hooks/usePendingEvals";
import { cn } from "@/lib/utils";
import { periodoLabel } from "./pending-presentation";

const SECTION_TITLE = "text-label-sm text-foreground";
const DATA_LABEL = "text-body-sm text-muted-foreground";
const DATA_VALUE = "mt-1 text-label-sm text-foreground";

/** Detalle de pendientes: evaluaciones a la izquierda y datos del empleado a la derecha. */
export function DetailModal({ item, onBack, onEvaluate }: {
  item: EmployeePending;
  onBack?: () => void;
  onEvaluate?: () => void;
}) {
  const router = useRouter();
  const evaluationsId = useId();
  const dataId = useId();
  const planEntregado = item.rg_rec_048 === "Entregado";
  const planVencido = !planEntregado && item.rg_dias_diff !== null && item.rg_dias_diff < 0;
  const tienePendienteVigente = item.evals.some(entry =>
    estadoVentanaEvaluacion(entry.numeroEvaluacion, entry.diasDiff) === "disponible"
  );

  return <DialogContent
    className="sm:max-w-2xl"
    footer={<DialogFooter>
      {tienePendienteVigente && item.numero ? <Button className="w-full sm:w-auto" onClick={() => {
        if (!item.numero) return;
        onEvaluate?.();
        router.push(`/desempeno?q=${encodeURIComponent(item.numero)}`);
      }}>
        Evaluar empleado
      </Button> : <p className="text-body-md text-muted-foreground">{!item.numero ? "Falta el número de empleado." : "No hay una evaluación pendiente del periodo vigente."}</p>}
    </DialogFooter>}
  >
    {onBack && <Button type="button" variant="ghost" size="sm" onClick={onBack} className="-ml-2 mb-2 pl-2 pr-3">
      <ChevronLeft aria-hidden="true" />Volver a la lista
    </Button>}
    <DialogHeader>
      <DialogDescription className="text-body-sm tabular-nums">#{item.numero ?? "—"}</DialogDescription>
      <DialogTitle>{item.nombre}</DialogTitle>
    </DialogHeader>

    <div className="grid gap-6 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section aria-labelledby={evaluationsId} className="min-w-0 space-y-2">
        <h3 id={evaluationsId} className={SECTION_TITLE}>Evaluaciones pendientes</h3>
        {item.evals.length > 0 ? <ul className="divide-y rounded-md border">
          {item.evals.map(entry => {
            const disponible = estadoVentanaEvaluacion(entry.numeroEvaluacion, entry.diasDiff) === "disponible";
            const vencida = pendingEvalStatus(entry.diasDiff, entry.numeroEvaluacion) === "vencidas";
            return <li key={entry.periodo} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-label-sm text-foreground">{entry.periodo}</p>
                <p className="break-words text-body-sm text-muted-foreground">
                  {periodoLabel(entry.fecha).toLocaleLowerCase("es-MX")} · {formatDate(entry.fecha)}
                </p>
              </div>
              <span className={cn("shrink-0 text-body-sm font-medium", vencida ? "text-destructive" : "text-success")}>
                {disponible ? "Disponible" : dias(entry.diasDiff)}
              </span>
            </li>;
          })}
        </ul> : <p className="text-body-md text-muted-foreground">No hay evaluaciones pendientes. Revisa el plan de formación.</p>}
      </section>

      <section aria-labelledby={dataId} className="min-w-0 space-y-2">
        <h3 id={dataId} className={SECTION_TITLE}>Datos del empleado</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border p-3 sm:grid-cols-1">
          <div>
            <dt className={DATA_LABEL}>Ingreso</dt>
            <dd className={DATA_VALUE}>{formatDate(item.fecha_ingreso)}</dd>
          </div>
          <div>
            <dt className={DATA_LABEL}>Término de contrato</dt>
            <dd className={DATA_VALUE}>{formatDate(item.termino_contrato)}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className={DATA_LABEL}>Plan de formación</dt>
            <dd className={cn(DATA_VALUE, planEntregado ? "text-success" : planVencido && "text-destructive")}>
              {planEntregado ? "Entregado" : "Pendiente"}
            </dd>
            {!planEntregado && item.fecha_vencimiento_rg && item.rg_dias_diff !== null && <dd className={DATA_LABEL}>
              {formatDate(item.fecha_vencimiento_rg)} · {dias(item.rg_dias_diff)}
            </dd>}
          </div>
        </dl>
      </section>
    </div>
  </DialogContent>;
}
