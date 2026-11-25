"use client";

import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EvaluationDraft } from "@/lib/desempeno/captura-local";

const savedAtFormatter = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" });

/** Captura a medio terminar de esta persona en este navegador: se retoma o se empieza de nuevo. */
export function DraftNotice({ draft, onRestore, onDiscard }: {
  draft: EvaluationDraft;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  return <section aria-labelledby="draft-notice-title" className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-(--card-padding) print:hidden">
    <History className="size-5 shrink-0 text-primary" aria-hidden="true" />
    <div className="grid min-w-0 flex-1 gap-0.5">
      <h2 id="draft-notice-title" className="text-label-sm text-foreground">Captura sin terminar</h2>
      <p className="text-body-sm text-muted-foreground">Guardada en este equipo el {savedAtFormatter.format(draft.savedAt)}.</p>
    </div>
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Button type="button" variant="ghost" onClick={onDiscard}>Empezar de nuevo</Button>
      <Button type="button" onClick={onRestore}>Continuar captura</Button>
    </div>
  </section>;
}
