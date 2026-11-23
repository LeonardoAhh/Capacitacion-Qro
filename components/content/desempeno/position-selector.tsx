"use client";

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ObjectivesCatalogContext } from "./use-objectives-catalog";

/** Selector de puesto del catálogo de objetivos, agrupado por departamento. */
export function PositionSelector({
  context,
  className
}: {
  context: ObjectivesCatalogContext;
  className?: string;
}) {
  const { departamentos, puesto, setPuesto } = context;
  return <Select value={puesto} onValueChange={setPuesto}>
    <SelectTrigger aria-label="Puesto" className={className}>
      <SelectValue placeholder="Selecciona un puesto…" />
    </SelectTrigger>
    <SelectContent className="max-h-80">
      {departamentos.map(([depto, { puestos }]) => <SelectGroup key={depto}>
          <SelectLabel>{depto}</SelectLabel>
          {puestos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectGroup>)}
    </SelectContent>
  </Select>;
}
