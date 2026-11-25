"use client";

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DESEMPENO } from "@/lib/desempeno/presentation";
import { getGruposEvaluadores } from "@/lib/desempeno/evaluadores";

/** Radix Select supplies keyboard navigation, focus restoration and option semantics. */
export function ComboboxEvaluador({
  value,
  onChange,
  puestoEvaluado,
  nombreEvaluado,
  invalid
}: {
  value: string;
  onChange: (value: string) => void;
  puestoEvaluado?: string;
  nombreEvaluado?: string;
  invalid?: boolean;
}) {
  const grupos = getGruposEvaluadores({ puesto: puestoEvaluado, evaluado: nombreEvaluado, actual: value });
  return <Select value={value} onValueChange={onChange}>
    <SelectTrigger aria-label={DESEMPENO.fields.evaluator} aria-invalid={invalid || undefined} title={value || undefined} className="w-full min-w-0 sm:max-w-sm"><SelectValue placeholder="Selecciona evaluador…" /></SelectTrigger>
    <SelectContent matchTriggerWidth>
      {grupos.map(({ grupo, evaluadores }) => <SelectGroup key={grupo}>
          <SelectLabel>{grupo}</SelectLabel>
          {evaluadores.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
      </SelectGroup>)}
  </SelectContent>
</Select>;
}
