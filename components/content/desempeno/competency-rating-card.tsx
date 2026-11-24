"use client";

import type { Competencia } from "@/lib/types/desempeno";
import { ESCALA_COMPETENCIAS } from "@/lib/types/desempeno";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CompetencyRatingCardProps {
  item: Competencia;
  name: string;
  showError: boolean;
  onChange: (value: number) => void;
}

export function CompetencyRatingCard({ item, name, showError, onChange }: CompetencyRatingCardProps) {
  const pending = item.evaluada !== true;
  const selected = pending ? undefined : ESCALA_COMPETENCIAS.find(({ valor }) => valor === item.calificacion);

  return <Card className={cn("@container", showError && pending && "border-destructive/50")}>
    <fieldset
      aria-invalid={showError && pending}
      data-competency-pending={pending ? "true" : undefined}
      className="grid min-w-0 gap-3 p-(--card-padding) @md:grid-cols-[minmax(0,1fr)_auto] @md:items-center @md:gap-4"
    >
      <legend className="sr-only">{item.nombre}</legend>
      <div className="min-w-0 space-y-1">
        <h3 className="text-label-sm text-foreground">{item.nombre}</h3>
        <p className="text-body-md text-foreground">{item.descripcion}</p>
      </div>
      {/* Debajo de los números, el significado de la respuesta elegida: no hay que memorizar la escala. */}
      <div className="space-y-1">
      <div className="grid grid-cols-5 gap-1 rounded-md border border-border bg-muted p-1">
        {ESCALA_COMPETENCIAS.map(({ valor, etiqueta }) => <label
          key={valor}
          className={cn(
            "relative flex min-h-(--control-height) min-w-(--control-height) cursor-pointer items-center justify-center rounded-md text-label-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
            item.evaluada && item.calificacion === valor
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
          )}
        >
          <input
            type="radio"
            name={name}
            value={valor}
            checked={item.evaluada === true && item.calificacion === valor}
            onChange={() => onChange(valor)}
            aria-label={`${valor}: ${etiqueta}`}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
          {valor}
        </label>)}
      </div>
      <p aria-hidden="true" className={cn("text-center text-body-sm", selected ? "font-medium text-foreground" : "text-muted-foreground")}>
        {selected ? `${selected.valor} · ${selected.etiqueta}` : "Sin calificar"}
      </p>
      </div>
    </fieldset>
  </Card>;
}
