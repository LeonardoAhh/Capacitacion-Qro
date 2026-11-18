"use client";

import { useId } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SavedEvaluationsContext } from "./use-saved-evaluations";

/** Sección plana: vive dentro del panel del catálogo, sin tarjeta propia. */
export function PositionSelector({
  context
}: {
  context: SavedEvaluationsContext;
}) {
  const headingId = useId();
  const {
    departamentos,
    puesto,
    setPuesto,
    hasPuestoObjetivos,
    tipoLabel
  } = context;
  return <section aria-labelledby={headingId} className="min-w-0 space-y-3">
    <div className="space-y-1">
      <h3 id={headingId} className="text-label-sm text-foreground">Seleccionar puesto</h3>
      <p className="text-body-sm text-muted-foreground">Catálogo de objetivos SMART por puesto.</p>
    </div>
    <Select value={puesto} onValueChange={setPuesto}>
      <SelectTrigger aria-label="Puesto del catálogo de objetivos">
        <SelectValue placeholder="Seleccionar puesto..." />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {departamentos.map(([depto, {
          puestos
        }]) => <SelectGroup key={depto}>
            <SelectLabel>{depto}</SelectLabel>
            {puestos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectGroup>)}
      </SelectContent>
    </Select>
    {puesto && <div className="flex flex-wrap gap-2">
      <Badge variant="secondary">
        {tipoLabel ? tipoLabel.charAt(0).toUpperCase() + tipoLabel.slice(1) : ""}
      </Badge>
      <Badge variant={hasPuestoObjetivos ? "default" : "outline"}>
        {hasPuestoObjetivos ? "Objetivos definidos" : "Genérico por tipo"}
      </Badge>
    </div>}
  </section>;
}
