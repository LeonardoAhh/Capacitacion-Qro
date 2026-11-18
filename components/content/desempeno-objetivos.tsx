"use client";

import { FieldValue, SectionTitle } from "./desempeno/presentation";
import { EvaluationWorkspace } from "./desempeno/workspace";
import { useSavedEvaluations } from "./desempeno/use-saved-evaluations";
import { ObjectivesCatalog } from "./desempeno/objectives-catalog";
import { SavedHistory } from "./desempeno/saved-history";
import { SavedDetail } from "./desempeno/saved-detail";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScoreBadge } from "./desempeno-score-badge";
import { PrintInstructionDialog } from "./print-instruction-dialog";
import DesempenoPrint from "./desempeno-print";
export default function DesempenoObjetivos() {
  const context = useSavedEvaluations();
  const {
    puesto,
    showPrintDialog,
    setShowPrintDialog,
    data,
    loading,
    objetivos,
    hasPuestoObjetivos,
    bloqueado,
    empleadoSel
  } = context;
  return <TooltipProvider>
    <EvaluationWorkspace section="saved">
      <ObjectivesCatalog context={context} />
      <SavedHistory context={context} />

      {/* Print area for selected evaluation */}
      {data && !puesto && <Card className="print:hidden">
        <CardHeader className="p-6 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle>Evaluación cargada</SectionTitle>
            <Button variant="outline" size="sm" onClick={() => setShowPrintDialog(true)} disabled={bloqueado || loading}>
              <Printer aria-hidden="true" />
              {bloqueado ? "Captura compromisos" : "Imprimir"}
          </Button>
        </div>
      </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            <FieldValue label="Empleado">{data.numero_empleado} — {data.nombre}</FieldValue>
            <FieldValue label="Puesto">{data.puesto}</FieldValue>
            <FieldValue label="Periodo">{data.periodo || "—"}</FieldValue>
            <FieldValue label="Calificación"><ScoreBadge score={data.calificacion_final} /></FieldValue>
          </div>
        </CardContent>
    </Card>}
      {/* Detalle de evaluaciones del empleado — modal (PC) / sheet (móvil) */}
      {empleadoSel && <SavedDetail context={context} />}

      {/* Hidden print area */}
      {data && !loading && <div className="print-area hidden print:block">
        <DesempenoPrint data={data} />
    </div>}

      <PrintInstructionDialog open={showPrintDialog && !!data && !loading && !bloqueado} onOpenChange={setShowPrintDialog} onConfirm={() => {
        if (data && !loading && !bloqueado) window.print();
      }} />
  </EvaluationWorkspace>
</TooltipProvider>;
}
