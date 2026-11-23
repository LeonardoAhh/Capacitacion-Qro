"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveShell } from "@/components/ui/responsive-shell";
import { SavedEvaluationCard } from "./saved-evaluation-card";
import { SAVED_DETAIL } from "./saved-detail-copy";
import { empleadoDetalle, type SavedEvaluationsContext } from "./use-saved-evaluations";

/** Evaluaciones de un empleado: mismo par nombre / detalle que la lista y una fila por evaluación. */
export function SavedDetail({ context }: { context: SavedEvaluationsContext }) {
  const { empleadoSel, setSelectedNumero } = context;
  if (!empleadoSel) return null;
  const close = () => setSelectedNumero(null);

  return (
    <ResponsiveShell open onClose={close} title={`${SAVED_DETAIL.title}: ${empleadoSel.nombre}`} description={SAVED_DETAIL.description} size="sm">
      <header className="flex shrink-0 items-start gap-3 border-b px-(--card-padding) py-3">
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-heading-md text-foreground">{empleadoSel.nombre}</h2>
          <p className="truncate text-body-sm text-muted-foreground">{empleadoDetalle(empleadoSel)}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="-mr-2 shrink-0" onClick={close} aria-label={SAVED_DETAIL.close}>
          <X aria-hidden="true" />
        </Button>
      </header>
      <div className="min-h-0 overflow-y-auto overscroll-contain p-(--card-padding) safe-bottom-content">
        {empleadoSel.evals.length ? <ul className="divide-y rounded-xl border bg-card">
          {empleadoSel.evals.map(ev => <li key={ev.id}>
            <SavedEvaluationCard evaluation={ev} actions={context} />
          </li>)}
        </ul> : <p className="py-4 text-body-md text-muted-foreground">{SAVED_DETAIL.empty}</p>}
      </div>
    </ResponsiveShell>
  );
}
