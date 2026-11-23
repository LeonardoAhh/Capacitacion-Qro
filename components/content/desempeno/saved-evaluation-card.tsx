import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { Pencil, Printer, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { esPeriodoSemestral } from "@/lib/desempeno/elegibilidad";
import { DESEMPENO } from "@/lib/desempeno/presentation";
import type { SavedEvaluationsContext } from "./use-saved-evaluations";
import { SAVED_DETAIL } from "./saved-detail-copy";
import { HITOS_NUEVO_INGRESO } from "@/lib/desempeno/hitos-nuevo-ingreso";

type Evaluation = NonNullable<SavedEvaluationsContext["empleadoSel"]>["evals"][number];
type Actions = Pick<SavedEvaluationsContext, "loading" | "pendingPrintId" | "handlePrint" | "eliminarEvaluacion" | "canEdit">;

/** Botón de ícono con tooltip de la app (sin tooltip nativo). */
function IconAction({ label, children }: { label: string; children: ReactNode }) {
  return <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>;
}

/** Fila de una evaluación guardada: periodo y detalle, calificación y acciones. */
export function SavedEvaluationCard({ evaluation: ev, actions }: { evaluation: Evaluation; actions: Actions }) {
  const titleId = useId();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const periodo = ev.periodo || SAVED_DETAIL.noPeriod;
  const printing = actions.loading && actions.pendingPrintId === ev.id;
  const date = new Date(ev.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  const score = ev.calificacion_final == null ? null : Math.min(100, Math.max(0, ev.calificacion_final)).toFixed(0);
  const handleDelete = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    if (deleting) return;
    setDeleting(true);
    const deleted = await actions.eliminarEvaluacion(ev.id);
    if (!deleted) {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <article aria-labelledby={titleId} className="flex items-center gap-3 px-(--card-padding) py-3">
      <div className="min-w-0 flex-1">
        <h3 id={titleId} className="truncate text-label-sm text-foreground">
          {periodo}{ev.hito_nuevo_ingreso ? ` · ${HITOS_NUEVO_INGRESO[ev.hito_nuevo_ingreso - 1].etiqueta}` : ""}
        </h3>
        <p className="truncate text-body-sm text-muted-foreground">
          {ev.periodo && <>{esPeriodoSemestral(ev.periodo) ? DESEMPENO.modes.semestrales : DESEMPENO.modes.mensuales}{" · "}</>}
          <time dateTime={ev.created_at}>{date}</time>
        </p>
      </div>
      <p className="shrink-0 text-label-sm tabular-nums text-foreground">
        <span className="sr-only">{SAVED_DETAIL.score}: </span>{score == null ? SAVED_DETAIL.noScore : `${score}%`}
      </p>
      <div className="flex shrink-0 items-center">
        <IconAction label={SAVED_DETAIL.edit}>
          <Button variant="ghost" size="icon" asChild aria-label={`${SAVED_DETAIL.edit}: ${periodo}`}>
            <Link href={`${DESEMPENO.routes.home}?evalId=${ev.id}`}><Pencil aria-hidden="true" /></Link>
          </Button>
        </IconAction>
        <IconAction label={SAVED_DETAIL.print}>
          <Button type="button" variant="ghost" size="icon" disabled={actions.loading} onClick={() => actions.handlePrint(ev.id)} aria-busy={printing} aria-label={`${printing ? SAVED_DETAIL.printing : SAVED_DETAIL.print}: ${periodo}`}>
            {printing ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Printer aria-hidden="true" />}
          </Button>
        </IconAction>
        {actions.canEdit && (confirmingDelete
          ? <Button type="button" variant="destructive" size="sm" className="ml-1" disabled={deleting} aria-busy={deleting} autoFocus
              onClick={handleDelete}
              onBlur={() => { if (!deleting) setConfirmingDelete(false); }}
              onKeyDown={event => { if (event.key === "Escape") setConfirmingDelete(false); }}
              aria-label={`Confirmar eliminación: ${periodo}`}>
              {deleting ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : "Confirmar"}
            </Button>
          : <IconAction label={SAVED_DETAIL.remove}>
              <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDelete} aria-label={`${SAVED_DETAIL.remove}: ${periodo}`}>
                <Trash2 aria-hidden="true" />
              </Button>
            </IconAction>)}
      </div>
    </article>
  );
}
