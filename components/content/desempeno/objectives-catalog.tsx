"use client";

import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PositionSelector } from "./position-selector";
import { evaluationStyles } from "./presentation";
import { useObjectivesCatalog } from "./use-objectives-catalog";

const COPY = {
  choose: "Selecciona un puesto para consultar sus objetivos SMART.",
  empty: "Sin objetivos para este puesto.",
  specific: "Objetivos del puesto",
  generic: "Generales por tipo",
} as const;

/** Catálogo de objetivos SMART: el puesto y su origen en la barra; los objetivos debajo. */
export function ObjectivesCatalog() {
  const context = useObjectivesCatalog();
  const { puesto, objetivos, hasPuestoObjetivos, tipoLabel } = context;
  return <>
    <div className="flex flex-wrap items-center gap-2">
      <PositionSelector context={context} className="w-full sm:w-80" />
      {puesto && <>
        {tipoLabel && <Badge variant="secondary" className="capitalize">{tipoLabel}</Badge>}
        <Badge variant={hasPuestoObjetivos ? "default" : "outline"}>{hasPuestoObjetivos ? COPY.specific : COPY.generic}</Badge>
      </>}
    </div>

    <section aria-label="Objetivos del puesto" aria-live="polite">
      {!puesto ? <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-(--card-padding) py-12 text-center">
        <Target className="size-6 text-muted-foreground" aria-hidden="true" />
        <p className={evaluationStyles.description}>{COPY.choose}</p>
      </div> : objetivos.length ? <ol className="divide-y rounded-xl border bg-card">
        {objetivos.map(obj => <li key={obj.numero} className="flex items-start gap-3 px-(--table-cell-padding-x) py-(--table-cell-padding-y)">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-label-sm tabular-nums text-muted-foreground" aria-hidden="true">{obj.numero}</span>
          <span className="min-w-0 break-words text-body-md text-foreground">{obj.descripcion}</span>
        </li>)}
      </ol> : <p className={evaluationStyles.description}>{COPY.empty}</p>}
    </section>
  </>;
}
