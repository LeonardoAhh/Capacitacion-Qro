"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { ArrowRight, ArrowUpRight } from "lucide";
import { MorphIcon } from "morphicons/react";
import { cn } from "@/lib/utils";
import type { PendingEvalStatus } from "@/lib/hooks/usePendingEvals";
import { PendingSummaryDetail } from "./pending-summary-detail";
import type { EvaluationSearchContext } from "./use-evaluation-search";
import { Skeleton } from "@/components/ui/skeleton";

const TONE = {
  danger: "text-destructive",
  warning: "text-warning-deep",
  success: "text-success",
} as const;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Resumen de evaluaciones pendientes: un aviso de una línea y tres cifras que abren su detalle. */
export function PendingSummary({ context }: { context: EvaluationSearchContext }) {
  const [activeStatus, setActiveStatus] = useState<PendingEvalStatus | null>(null);
  const [highlightedStatus, setHighlightedStatus] = useState<PendingEvalStatus | null>(null);
  const { data, existingEvaluation, pendingLoading, loading, deptGroups, totalEvals, totalVencidas, totalProximas, totalATiempo } = context;
  if (loading || data || existingEvaluation) return null;

  if (pendingLoading) return <div role="status" aria-busy="true" className="space-y-3">
    <span className="sr-only">Consultando evaluaciones pendientes</span>
    <Skeleton aria-hidden="true" className="h-5 w-2/5 max-w-80" />
    <Skeleton aria-hidden="true" className="h-16 w-full rounded-xl" />
  </div>;

  if (totalEvals === 0) return null;

  const notice = totalVencidas > 0
    ? { tone: TONE.danger, title: plural(totalVencidas, "evaluación atrasada", "evaluaciones atrasadas"), text: "Ya pasaron su fecha límite; atiéndelas primero." }
    : totalProximas > 0
      ? { tone: TONE.warning, title: `${plural(totalProximas, "evaluación vence", "evaluaciones vencen")} pronto`, text: "Ya pueden evaluarse; atiéndelas pronto." }
      : { tone: TONE.success, title: "Evaluaciones al día", text: `${plural(totalEvals, "pendiente", "pendientes")} con tiempo suficiente.` };

  const stats = [
    { status: "vencidas", label: "Vencidas", hint: "Pasó su fecha límite", value: totalVencidas, tone: TONE.danger },
    { status: "proximas", label: "Próximas", hint: "Ya pueden evaluarse", value: totalProximas, tone: TONE.warning },
    { status: "a-tiempo", label: "A tiempo", hint: "Aún no llega su fecha", value: totalATiempo, tone: TONE.success },
  ] as const;

  return <section aria-label="Evaluaciones pendientes" className="space-y-3">
    <p className="flex min-w-0 items-start gap-2">
      <ClipboardList className={cn("mt-0.5 size-4 shrink-0", notice.tone)} aria-hidden="true" />
      <span className="min-w-0">
        <span className="text-label-sm text-foreground">{notice.title}</span>
        <span className="text-body-sm text-muted-foreground"> · {notice.text}</span>
      </span>
    </p>

    {/* Cada cifra: qué es a la izquierda; número y acceso al detalle a la derecha. */}
    <div className="grid divide-y overflow-hidden rounded-xl border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {stats.map(({ status, label, hint, value, tone }) => <button key={status} type="button"
        onClick={() => setActiveStatus(status)}
        onMouseEnter={() => setHighlightedStatus(status)} onMouseLeave={() => setHighlightedStatus(null)}
        onFocus={() => setHighlightedStatus(status)} onBlur={() => setHighlightedStatus(null)}
        aria-haspopup="dialog" aria-label={`${label}: ${plural(value, "evaluación", "evaluaciones")}. Ver detalle`}
        className="flex min-w-0 items-center gap-3 px-(--card-padding) py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-label-sm text-foreground">{label}</span>
          <span className="block truncate text-body-sm text-muted-foreground">{hint}</span>
        </span>
        <span className={cn("text-heading-xl tabular-nums", value > 0 ? tone : "text-muted-foreground")}>{value}</span>
        <MorphIcon icon={highlightedStatus === status ? ArrowUpRight : ArrowRight} size={16} strokeWidth={2} spring="snappy" reducedMotion="user" className="shrink-0 text-muted-foreground" />
      </button>)}
    </div>

    <PendingSummaryDetail status={activeStatus} groups={deptGroups} onOpenChange={open => { if (!open) setActiveStatus(null); }} />
  </section>;
}
