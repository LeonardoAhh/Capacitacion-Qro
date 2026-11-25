"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { EVALUATION_STEPS } from "@/lib/desempeno/presentation";
import { cn } from "@/lib/utils";

/**
 * Pasos de la evaluación siempre a la vista: los recorridos se marcan y se puede
 * volver a ellos con un clic; el actual se resalta y los siguientes se abren con Siguiente.
 */
export function EvaluationStepper({ activeView, onSelect }: { activeView: number; onSelect: (view: number) => void }) {
  return <nav aria-label="Pasos de la evaluación" className="space-y-2">
    <p className="text-body-sm text-muted-foreground" aria-live="polite">
      Paso {activeView} de {EVALUATION_STEPS.length} · <span className="font-medium text-foreground">{EVALUATION_STEPS[activeView - 1]}</span>
    </p>
    <ol className="grid grid-cols-5 gap-1">
      {EVALUATION_STEPS.map((label, index) => {
        const view = index + 1;
        const done = view < activeView;
        const current = view === activeView;
        return <li key={label} className="min-w-0">
          <button type="button" disabled={!done} onClick={() => onSelect(view)} aria-current={current ? "step" : undefined}
            aria-label={done ? `Volver a ${label}` : label}
            className={cn("flex min-h-(--control-height) w-full min-w-0 flex-col justify-center gap-1.5 rounded-md text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              done ? "cursor-pointer text-foreground hover:text-primary" : "cursor-default",
              current ? "text-foreground" : !done && "text-muted-foreground")}>
            <span aria-hidden="true" className={cn("h-1 w-full rounded-sm transition-colors duration-200 motion-reduce:transition-none", done || current ? "bg-primary" : "bg-muted")} />
            <span className="flex min-w-0 items-center gap-1 text-body-sm">
              {done ? <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" /> : <span className="shrink-0 tabular-nums">{view}</span>}
              <span className={cn("hidden truncate sm:inline", current && "font-medium")}>{label}</span>
            </span>
          </button>
        </li>;
      })}
    </ol>
  </nav>;
}

/**
 * Cierre de cada paso, al final del contenido: Atrás a la izquierda y Siguiente / Guardar a la
 * derecha; junto a este, el avance del paso o lo que falta si se intentó avanzar.
 */
export function EvaluationNavBar({ back, next, done, total, error }: {
  back: ReactNode;
  next: ReactNode;
  done: number;
  total: number;
  error: string;
}) {
  const message = error || (total > 1 ? `${done}/${total} respondidos` : "");
  return <div role="group" aria-label="Navegación de la evaluación" className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4">
    {back}
    <p role={error ? "alert" : "status"}
      className={cn("order-first w-full text-body-sm tabular-nums sm:order-none sm:w-auto sm:flex-1 sm:text-right", error ? "text-destructive" : "text-muted-foreground", !message && "max-sm:hidden")}>
      {message}
    </p>
    <div className="ml-auto sm:ml-0">{next}</div>
  </div>;
}
