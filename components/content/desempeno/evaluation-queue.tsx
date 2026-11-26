"use client";

import Link from "next/link";
import { ChevronRight, ClipboardList } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DESEMPENO } from "@/lib/desempeno/presentation";
import type { QueueItem } from "./use-evaluation-queue";

/** Cuántas personas se listan aquí; el resto se consulta en Por evaluar. */
const QUEUE_PREVIEW = 8;
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * Inicio de Evaluar para el evaluador: a quién le toca evaluar hoy. Un clic en
 * la persona abre su evaluación; no hace falta recordar números ni escribir.
 */
export function EvaluationQueue({ items, loading, overdue, onStart }: {
  items: QueueItem[];
  loading: boolean;
  overdue: number;
  onStart: (item: QueueItem) => void;
}) {
  if (loading) return <div role="status" aria-busy="true" className="space-y-3">
    <span className="sr-only">Consultando a quién te toca evaluar</span>
    <Skeleton aria-hidden="true" className="h-5 w-56" />
    <div aria-hidden="true" className="divide-y overflow-hidden rounded-xl border bg-card">
      {[0, 1, 2].map(row => <div key={row} className="flex items-center gap-3 px-(--card-padding) py-3">
        <div className="min-w-0 flex-1 space-y-1.5"><Skeleton className="h-4 w-2/5" /><Skeleton className="h-3.5 w-1/4" /></div>
        <Skeleton className="h-4 w-16" />
      </div>)}
    </div>
  </div>;

  return <section aria-labelledby="evaluation-queue-title" className="space-y-3 print:hidden">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 id="evaluation-queue-title" className="flex items-center gap-2 text-label-sm text-foreground">
        <ClipboardList className="size-4 text-primary" aria-hidden="true" />
        {items.length ? `Te ${items.length === 1 ? "toca" : "tocan"} ${plural(items.length, "evaluación", "evaluaciones")}` : "Sin evaluaciones pendientes"}
      </h2>
      {items.length > QUEUE_PREVIEW && <Link href={DESEMPENO.routes.pending} className="rounded-sm text-body-sm text-primary underline-offset-4 hover:underline">
        Ver las {items.length} en {DESEMPENO.pages.pending.title}
      </Link>}
    </div>

    {overdue > 0 && <p className="text-body-sm text-muted-foreground">
      {plural(overdue, "evaluación atrasada requiere", "evaluaciones atrasadas requieren")} regularización: acude a Recursos Humanos.
    </p>}

    {items.length > 0 && <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {items.slice(0, QUEUE_PREVIEW).map(item => <li key={item.numero}>
        <button type="button" onClick={() => onStart(item)}
          className="flex min-h-(--control-height) w-full items-center gap-3 px-(--card-padding) py-3 text-left transition-colors hover:bg-muted/40 focus-inset">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-label-sm text-foreground">{item.nombre}</span>
            <span className="block truncate text-body-sm text-muted-foreground">#{item.numero} · {item.tipo}{item.detalle ? ` · ${item.detalle}` : ""}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-label-sm text-primary">
            Evaluar<ChevronRight className="size-4" aria-hidden="true" />
          </span>
        </button>
      </li>)}
    </ul>}
  </section>;
}
