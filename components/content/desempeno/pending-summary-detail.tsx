"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/hooks/useNuevoIngreso";
import { pendingEvalStatus, type DeptGroup, type EmployeePending, type PendingEvalStatus } from "@/lib/hooks/usePendingEvals";
import { estadoVentanaEvaluacion } from "@/lib/desempeno/hitos-nuevo-ingreso";
import { Clock3 } from "lucide-react";
import { DetailModal } from "./pending-detail";
import { PendingCard, PendingCardFields, PendingCardStatus } from "./pending-card";

const titles: Record<PendingEvalStatus, string> = {
  vencidas: "Evaluaciones vencidas",
  proximas: "Evaluaciones próximas",
  "a-tiempo": "Evaluaciones a tiempo",
};

const STATUS_TONES = {
  vencidas: "destructive",
  proximas: "warning",
  "a-tiempo": "success",
} as const satisfies Record<PendingEvalStatus, "destructive" | "warning" | "success">;

function relativeDays(diff: number) {
  if (diff === 0) return "Hoy";
  const count = Math.abs(diff);
  const unit = count === 1 ? "día" : "días";
  return diff < 0 ? `Hace ${count} ${unit}` : `En ${count} ${unit}`;
}

export function PendingSummaryDetail({ status, groups, onOpenChange }: {
  status: PendingEvalStatus | null;
  groups: DeptGroup[];
  onOpenChange: (open: boolean) => void;
}) {
  const [selected, setSelected] = useState<EmployeePending | null>(null);
  const entries = groups.flatMap(group => group.items.flatMap(employee =>
    employee.evals.filter(entry => pendingEvalStatus(entry.diasDiff, entry.numeroEvaluacion) === status)
      .map(entry => ({ employee, entry, departamento: group.departamento }))
  )).sort((a, b) =>
    b.entry.numeroEvaluacion - a.entry.numeroEvaluacion
    || a.entry.diasDiff - b.entry.diasDiff
    || a.employee.nombre.localeCompare(b.employee.nombre, "es")
  );
  return <Dialog open={status !== null} onOpenChange={open => {
    if (!open) setSelected(null);
    onOpenChange(open);
  }}>
    {selected ? <DetailModal item={selected} onBack={() => setSelected(null)} onEvaluate={() => {
      setSelected(null);
      onOpenChange(false);
    }} /> : <DialogContent className="sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>{status ? titles[status] : "Evaluaciones pendientes"}</DialogTitle>
        <DialogDescription>{entries.length} {entries.length === 1 ? "evaluación pendiente" : "evaluaciones pendientes"} en este estado.</DialogDescription>
      </DialogHeader>
      {entries.length > 0 ? <ul className="grid gap-2 sm:grid-cols-2">
        {entries.map(({ employee, entry, departamento }) => {
          const disponible = estadoVentanaEvaluacion(entry.numeroEvaluacion, entry.diasDiff) === "disponible";
          const when = disponible ? "Disponible" : relativeDays(entry.diasDiff);
          return <li key={`${employee.dbId}:${entry.periodo}:${entry.fecha}`} className="min-w-0">
            <PendingCard asChild interactive>
              <button type="button" onClick={() => setSelected(employee)} aria-label={`Ver detalle de ${employee.nombre}, ${entry.periodo}, ${when}`} className="h-full w-full">
                <PendingCardFields
                  number={employee.numero}
                  name={employee.nombre}
                  detail={`${entry.periodo} · ${departamento} · Límite ${formatDate(entry.fecha)}`}
                  status={<PendingCardStatus tone={disponible ? "success" : STATUS_TONES[status ?? "a-tiempo"]} icon={<Clock3 className="size-3.5 shrink-0" aria-hidden="true" />}>{when}</PendingCardStatus>}
                />
              </button>
            </PendingCard>
          </li>;
        })}
      </ul> : <p role="status" className="rounded-md border px-4 py-6 text-center text-body-md text-muted-foreground">
        No hay evaluaciones pendientes en este estado.
      </p>}
    </DialogContent>}
  </Dialog>;
}
