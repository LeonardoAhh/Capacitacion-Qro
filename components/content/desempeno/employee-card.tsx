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
  return tipo ? (TIPO_LABEL[tipo] ?? tipo).toUpperCase() : "";
}
export function EmployeeCard({
  context
}: {
  context: EvaluationFormContext;
}) {
  const {
    data,
    canEdit,
    handleEvaluadorChange
  } = context;
  return <Card className="@container">
      <CardHeader className="space-y-3 p-(--card-padding)">
        <p className="text-body-sm text-muted-foreground">
          <span className="font-medium text-foreground">Instrucciones para el evaluador:</span> {DESEMPENO.instructions}
      </p>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <SectionTitle>EVALUACIÓN DE DESEMPEÑO PERSONAL {getTipoLabel(data.tipo)}</SectionTitle>
            <Badge variant="default" className="font-medium">{data.periodo || "—"}</Badge>
            {data.hito_nuevo_ingreso && <Badge variant="outline" className="font-medium">{HITOS_NUEVO_INGRESO[data.hito_nuevo_ingreso - 1].etiqueta}</Badge>}
          </div>
          <Image src="/logo-vino-plastic.png" alt="Logotipo de VIÑOPLASTIC" width={400} height={400} className="h-10 w-auto object-contain" onError={e => {
            e.currentTarget.style.display = "none";
          }} />
        </div>
      </CardHeader>

      {/* El valor toma la tipografía de FieldValue; aquí solo se enfatiza. */}
      <CardContent className="grid grid-cols-1 gap-x-6 gap-y-4 p-(--card-padding) pt-0 @lg:grid-cols-2">
        <FieldValue label={DESEMPENO.fields.employeeNumber}>
          <span className="font-medium">{data.numero_empleado || "—"}</span>
        </FieldValue>
        <FieldValue label={DESEMPENO.fields.name}>
          <span className="font-medium">{data.nombre || "—"}</span>
        </FieldValue>
        <FieldValue label={DESEMPENO.fields.position}>
          <span className="font-medium">{data.puesto || "—"}</span>
        </FieldValue>
        <FieldValue label={DESEMPENO.fields.evaluator}>
          {canEdit
            ? <ComboboxEvaluador value={data.evaluador_nombre ?? ""} onChange={handleEvaluadorChange} puestoEvaluado={data.puesto} nombreEvaluado={data.nombre} />
            : <span className="font-medium">{data.evaluador_nombre || "—"}</span>}
        </FieldValue>
      </CardContent>
    </Card>;
}
