"use client";

import type { EvaluationFormContext } from "./use-evaluation-form";
import { Card, CardContent } from "@/components/ui/card";
export function ScoreCard({
  context
}: {
  context: EvaluationFormContext;
}) {
  const {
    ponderacion
  } = context;
  return <Card className="text-center">
    <CardContent className="p-6">
      <div className="text-display-xl tabular-nums text-foreground" aria-live="polite" aria-atomic="true">
        {ponderacion.calificacionFinal}%
      </div>
      <p className="mt-2 text-label-sm text-muted-foreground">Calificación del periodo</p>
    </CardContent>
  </Card>;
}
