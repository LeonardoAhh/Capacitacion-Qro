"use client";

import { evaluationStyles, FieldValue, SectionTitle } from "./presentation";
import { DESEMPENO } from "@/lib/desempeno/presentation";

import type { EvaluationFormContext } from "./use-evaluation-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
export function CommitmentsCard({
  context
}: {
  context: EvaluationFormContext;
}) {
  const {
    data,
  } = context;
  return <Card>
    <CardHeader className="p-(--card-padding) pb-3">
      <SectionTitle>{DESEMPENO.sections.compromisos}</SectionTitle>
      <p className={evaluationStyles.description}>{DESEMPENO.descriptions.compromisos}</p>
  </CardHeader>
    <CardContent className="space-y-3 p-(--card-padding) pt-0">
      <FieldValue label={DESEMPENO.fields.commitments}>
        <p className="whitespace-pre-line">{data.compromisos || "Sin compromisos"}</p>
    </FieldValue>
      <FieldValue label={DESEMPENO.fields.reviewDate}>
        <p>{data.fecha_revision || "Sin fecha"}</p>
    </FieldValue>
      <FieldValue label={DESEMPENO.fields.observations}>
        <p>{data.observaciones || "Sin observaciones"}</p>
    </FieldValue>
  </CardContent>
</Card>;
}
