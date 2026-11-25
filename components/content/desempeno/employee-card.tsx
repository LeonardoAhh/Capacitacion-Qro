"use client";

import { SectionTitle } from "./presentation";
import Image from "next/image";
import { DESEMPENO } from "@/lib/desempeno/presentation";
import type { EvaluationFormContext } from "./use-evaluation-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TIPO_LABEL } from "@/lib/catalogo";
import { FieldValue } from "./presentation";
import { ComboboxEvaluador } from "./evaluator-select";
import { HITOS_NUEVO_INGRESO } from "@/lib/desempeno/hitos-nuevo-ingreso";
function getTipoLabel(tipo: string | undefined): string {
  return tipo ? (TIPO_LABEL[tipo] ?? tipo) : "";
}
export function EmployeeCard({
  context
}: {
  context: EvaluationFormContext;
}) {
  const {
    data,
    canEdit,
    stepError,
    handleEvaluadorChange
  } = context;
  const tipoLabel = getTipoLabel(data.tipo);
  return <Card className="@container">
      <CardHeader className="space-y-3 p-(--card-padding)">
        <details className="group text-body-sm text-muted-foreground">
          <summary className="w-fit cursor-pointer rounded-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Instrucciones</summary>
          <p className="mt-1">{DESEMPENO.instructions}</p>
        </details>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <SectionTitle>{tipoLabel ? `Evaluación de desempeño · ${tipoLabel}` : "Evaluación de desempeño"}</SectionTitle>
            {data.periodo && <Badge variant="default" className="font-medium">{data.periodo}</Badge>}
            {data.hito_nuevo_ingreso && <Badge variant="outline" className="font-medium">{HITOS_NUEVO_INGRESO[data.hito_nuevo_ingreso - 1].etiqueta}</Badge>}
          </div>
          <Image src="/logo-vino-plastic.png" alt="Logotipo de VIÑOPLASTIC" width={400} height={400} className="h-10 w-auto object-contain" onError={e => {
            e.currentTarget.style.display = "none";
          }} />
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1 gap-x-6 gap-y-4 p-(--card-padding) pt-0 @lg:grid-cols-2">
        <FieldValue label={DESEMPENO.fields.employeeNumber}>
          <span className="font-medium tabular-nums">{data.numero_empleado || "Sin dato"}</span>
        </FieldValue>
        <FieldValue label={DESEMPENO.fields.name}>
          <span className="font-medium">{data.nombre || "Sin dato"}</span>
        </FieldValue>
        <FieldValue label={DESEMPENO.fields.position}>
          <span className="font-medium">{data.puesto || "Sin asignar"}</span>
        </FieldValue>
        <FieldValue label={DESEMPENO.fields.evaluator}>
          {canEdit
            ? <ComboboxEvaluador value={data.evaluador_nombre ?? ""} onChange={handleEvaluadorChange} puestoEvaluado={data.puesto} nombreEvaluado={data.nombre} invalid={Boolean(stepError) && !data.evaluador_nombre} />
            : <span className="font-medium">{data.evaluador_nombre || "Sin asignar"}</span>}
        </FieldValue>
      </CardContent>
    </Card>;
}
