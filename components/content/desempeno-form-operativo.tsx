"use client";

import { useId } from "react";
import type { DesempenoData } from "@/lib/types/desempeno";
import { ESCALA_COMPETENCIAS, UMBRAL_CALIFICACION_APROBATORIA, validarEvaluacion, esPorcentajeValido, CumplimientoOperativoIndex } from "@/lib/types/desempeno";
import { EVALUATION_STEPS, EVALUATION_WEIGHTS } from "@/lib/desempeno/presentation";
import { EmployeeCard } from "./desempeno/employee-card";
import { useEvaluationForm, type EvaluationFormContext } from "./desempeno/use-evaluation-form";
import { ScoreCard } from "./desempeno/score-card";
import { CommitmentsCard } from "./desempeno/commitments-card";
import { CompetenciesCard } from "./desempeno/competencies-card";
import { ResponsibilitiesCard } from "./desempeno/responsibilities-card";
import { ObjectivesCard } from "./desempeno/objectives-card";
import { PercentageCriterionCard } from "./desempeno/percentage-criterion-card";
import { CompetencyRatingCard } from "./desempeno/competency-rating-card";
import { ReviewDateField } from "./desempeno/review-date-field";
import { ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { evaluationStyles } from "./desempeno/presentation";

interface Props {
  data: DesempenoData;
  onUpdate?: (data: DesempenoData) => void;
  onGuardar?: () => void;
  guardarDisabled?: boolean;
  guardarTooltip?: string;
  saving?: boolean;
  lateCapture?: {
    motivo: string;
    onMotivoChange: (value: string) => void;
  };
  /** Salida desde el primer paso (p. ej. volver a la lista de captura tardía). */
  onExit?: () => void;
}

// Fila de etiqueta compartida: alinea columnas aunque una lleve pista o acción.
const FIELD_HEAD = "flex min-h-7 flex-wrap items-center justify-between gap-x-4 gap-y-1";

function PercentageControl({ id, label, value, noAplica, automatic, helpId, showError, onChange }: {
  id: string;
  label: string;
  value: string;
  noAplica?: boolean;
  automatic?: boolean;
  helpId: string;
  showError: boolean;
  onChange: (value: string, noAplica?: boolean) => void;
}) {
  const pending = !automatic && noAplica !== true && !esPorcentajeValido(value);
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-2 @md:justify-end">
    <Label htmlFor={id} className="text-muted-foreground">{label}</Label>
    {automatic && <span className="text-body-sm text-muted-foreground">Dato automático</span>}
    <Input id={id} name={id} type="number" inputMode="numeric" min={0} max={100}
      value={noAplica ? "" : value === "NA" ? "" : value}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "").slice(0, 3);
        onChange(digits && Number(digits) > 100 ? "100" : digits, false);
      }}
      disabled={noAplica || automatic} readOnly={automatic} aria-describedby={helpId}
      aria-invalid={showError && pending} className={cn("w-20 shrink-0 font-medium tabular-nums", showError && pending && "border-destructive")} />
    {!automatic && <label className="inline-flex min-h-(--control-height) cursor-pointer items-center gap-2 rounded-md px-2 text-label-sm hover:bg-muted">
      <input type="checkbox" checked={noAplica === true} onChange={(event) => onChange("", event.target.checked)} className="size-4 accent-primary" />
      No aplica
    </label>}
  </div>;
}

function StepHeading({ context, title, description }: { context: EvaluationFormContext; title: string; description: string }) {
  return <div className="space-y-1 xl:flex xl:items-baseline xl:justify-between xl:gap-6 xl:space-y-0">
    <h2 id={context.headingId} tabIndex={-1} className="rounded-md text-heading-md text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring xl:shrink-0">{title}</h2>
    <p className={cn(evaluationStyles.description, "xl:min-w-0 xl:text-right")}>{description}</p>
  </div>;
}

export function DesempenoForm({ data, onUpdate, onGuardar, guardarDisabled, guardarTooltip, saving, lateCapture, onExit }: Props) {
  const formId = useId();
  const percentageHelpId = `${formId}-percentage-help`;
  const automaticHelpId = `${formId}-automatic-help`;
  const context = useEvaluationForm({ data, onUpdate, onGuardar, guardarDisabled, guardarTooltip });
  const { activeView, goNextView, goPrevView, canEdit, stepError } = context;
  const validation = validarEvaluacion(data);
  const requiereCompromisos = context.ponderacion.calificacionFinal < UMBRAL_CALIFICACION_APROBATORIA;

  if (!canEdit) return <div className="space-y-6 dense:space-y-4">
    <EmployeeCard context={context} /><ObjectivesCard context={context} /><ResponsibilitiesCard context={context} /><CompetenciesCard context={context} />
    <div className="grid gap-6 dense:gap-4 md:grid-cols-2"><CommitmentsCard context={context} /><ScoreCard context={context} /></div>
  </div>;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (activeView < EVALUATION_STEPS.length) return goNextView();
    if (validation.valida && !guardarDisabled && !saving) onGuardar?.();
  };

  return <form className="space-y-6 dense:space-y-4 print:hidden" onSubmit={submit} noValidate>
    <p id={percentageHelpId} className="sr-only">Ingresa un porcentaje entero de 0 a 100 o marca No aplica.</p>
    <p id={automaticHelpId} className="sr-only">Calculado por el sistema para el periodo seleccionado.</p>

    {activeView === 1 && <div className="space-y-4"><StepHeading context={context} title="Datos de la evaluación" description="Verifica a la persona, el periodo y selecciona al evaluador responsable." /><EmployeeCard context={context} /></div>}

    {activeView === 2 && <div className="space-y-4">
      <StepHeading context={context} title={`Objetivos (${EVALUATION_WEIGHTS.objetivos * 100}%)`} description="Ingresa de 0 a 100% o marca No aplica en cada objetivo." />
      <div className="grid gap-3 lg:auto-rows-fr lg:grid-cols-2">{data.objetivos.map((item, index) => <PercentageCriterionCard
        key={`${item.numero}-${index}`}
        title={`Objetivo ${item.numero}`}
        description={item.descripcion}
        metadataLabel="Meta"
        metadata={item.resultado || "Sin meta definida"}
      >
        <PercentageControl id={`${formId}-objetivo-${index}`} label="Resultado (%)" value={item.porcentaje} noAplica={item.no_aplica} helpId={percentageHelpId} showError={Boolean(stepError)} onChange={(value, na) => context.updateObjetivo(index, value, na)} />
      </PercentageCriterionCard>)}</div>
    </div>}

    {activeView === 3 && <div className="space-y-4">
      <StepHeading context={context} title={`Responsabilidades (${EVALUATION_WEIGHTS.cumplimiento * 100}%)`} description="Completa cada responsabilidad con un porcentaje o marca No aplica cuando corresponda." />
      <div className="grid gap-3 lg:auto-rows-fr lg:grid-cols-2">{data.cumplimiento_responsabilidades.map((item, index) => {
        const automatic = data.tipo !== "jefe"
          && (
            index === CumplimientoOperativoIndex.Compromisos
            || index === CumplimientoOperativoIndex.Reglamento
            || index === CumplimientoOperativoIndex.Asistencia
            || index === CumplimientoOperativoIndex.Puntualidad
            || index === CumplimientoOperativoIndex.Permisos
          );
        return <PercentageCriterionCard
          key={`${item.descripcion}-${index}`}
          title={`Responsabilidad ${index + 1}`}
          description={item.descripcion}
          metadataLabel="Evalúa"
          metadata={item.evalua}
        >
          <PercentageControl id={`${formId}-responsabilidad-${index}`} label="Cumplimiento (%)" value={item.porcentaje} noAplica={item.no_aplica} automatic={automatic} helpId={automatic ? automaticHelpId : percentageHelpId} showError={Boolean(stepError)} onChange={(value, na) => context.updateResponsabilidad(index, value, na)} />
        </PercentageCriterionCard>;
      })}</div>
    </div>}

    {activeView === 4 && <div className="space-y-4">
      <StepHeading context={context} title={`Competencias (${EVALUATION_WEIGHTS.competencias * 100}%)`} description="Selecciona una calificación para cada competencia. El cero es una respuesta válida." />
      <div role="note" aria-label="Escala de competencias" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted-foreground">
        <span className="font-medium text-foreground">Escala</span>
        {ESCALA_COMPETENCIAS.map(({ valor, etiqueta }) => <span key={valor}>
          <span className="font-medium text-foreground">{valor}</span> {etiqueta}
        </span>)}
      </div>
      <div className="space-y-3">{data.competencias.map((item, index) => <CompetencyRatingCard
        key={`${item.nombre}-${index}`}
        item={item}
        name={`${formId}-competencia-${index}`}
        showError={Boolean(stepError)}
        onChange={(value) => context.updateCompetencia(index, value)}
      />)}</div>
    </div>}

    {activeView === 5 && <div className="space-y-4">
      <StepHeading context={context} title="Revisión y compromisos" description="Revisa el resultado y registra los acuerdos de seguimiento antes de guardar." />
      <Card><CardContent className="space-y-4 p-(--card-padding)">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
          <h3 className="text-label-sm text-muted-foreground">Calificación del periodo</h3>
          <p className="text-heading-xl tabular-nums text-foreground" aria-live="polite" aria-atomic="true">{context.ponderacion.calificacionFinal}%</p>
        </div>
        <div className="space-y-2">
          <div className={FIELD_HEAD}>
            <Label htmlFor={`${formId}-compromisos`}>Compromisos y acuerdos</Label>
            {requiereCompromisos && <span id={`${formId}-compromisos-hint`} className="text-body-sm text-muted-foreground">Obligatorios si la calificación es menor a {UMBRAL_CALIFICACION_APROBATORIA}%</span>}
          </div>
          <Textarea id={`${formId}-compromisos`} value={data.compromisos} onChange={(e) => context.updateReview({ compromisos: e.target.value })} aria-required={requiereCompromisos} aria-describedby={requiereCompromisos ? `${formId}-compromisos-hint` : undefined} className="min-h-24" />
        </div>
        {lateCapture ? <div className="grid gap-4 md:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-2">
            <div className={FIELD_HEAD}><Label htmlFor={`${formId}-observaciones`}>Observaciones</Label></div>
            <Textarea id={`${formId}-observaciones`} value={data.observaciones} onChange={(e) => context.updateReview({ observaciones: e.target.value })} className="min-h-24 flex-1" />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <div className={FIELD_HEAD}>
              <Label htmlFor={`${formId}-motivo`}>Motivo de la captura tardía</Label>
              <span id={`${formId}-motivo-hint`} className="text-body-sm text-muted-foreground">La fecha se asigna al guardar</span>
            </div>
            <Textarea id={`${formId}-motivo`} required aria-describedby={`${formId}-motivo-hint`} value={lateCapture.motivo} onChange={event => lateCapture.onMotivoChange(event.target.value)} className="min-h-24 flex-1" />
          </div>
        </div> : <div className="grid gap-4 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <ReviewDateField id={`${formId}-fecha`} value={data.fecha_revision} onChange={fecha_revision => context.updateReview({ fecha_revision })} />
          {/* Se estira para igualar la altura del calendario. */}
          <div className="flex min-w-0 flex-col gap-2">
            <div className={FIELD_HEAD}><Label htmlFor={`${formId}-observaciones`}>Observaciones</Label></div>
            <Textarea id={`${formId}-observaciones`} value={data.observaciones} onChange={(e) => context.updateReview({ observaciones: e.target.value })} className="min-h-24 flex-1 resize-none" />
          </div>
        </div>}
      </CardContent></Card>
      {guardarTooltip && <p role="status" className="text-body-sm text-muted-foreground">{guardarTooltip}</p>}
    </div>}

    <div role="group" aria-label="Navegación de la evaluación" className="flex items-center justify-between gap-3">
      <Button type="button" variant="outline" size="sm" onClick={activeView === 1 && onExit ? onExit : goPrevView} disabled={(activeView === 1 && !onExit) || saving} className="pl-2 pr-3"><ChevronLeft aria-hidden="true" />Atrás</Button>
      {activeView < EVALUATION_STEPS.length ? <Button type="submit" size="sm" className="pl-3 pr-2">Siguiente<ChevronRight aria-hidden="true" /></Button>
        : <Button type="submit" size="sm" className="pl-2 pr-3" disabled={!validation.valida || guardarDisabled || saving} aria-busy={saving || undefined}>{saving ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Save aria-hidden="true" />}{saving ? "Guardando…" : "Guardar evaluación"}</Button>}
    </div>
  </form>;
}
