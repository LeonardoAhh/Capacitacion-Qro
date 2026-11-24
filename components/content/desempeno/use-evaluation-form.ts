"use client";

import { useEffect, useId, useState } from "react";
import { useEvaluationReducedMotion } from "./use-evaluation-motion";
import {
  calcularPonderacion,
  tieneRespuestaPorcentaje,
  validarEvaluacion,
  UMBRAL_CALIFICACION_APROBATORIA,
  type DesempenoData,
} from "@/lib/types/desempeno";
import { EVALUADORES_PUESTO } from "@/lib/catalogo";

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Avance del paso: cuántas respuestas lleva y qué falta, en palabras. */
export function stepProgress(data: DesempenoData, view: number): { done: number; total: number; missing: string } {
  const count = <T,>(items: T[], answered: (item: T) => boolean) => ({ done: items.filter(answered).length, total: items.length });
  switch (view) {
    case 1:
      return { done: data.evaluador_nombre ? 1 : 0, total: 1, missing: "Selecciona al evaluador para continuar." };
    case 2: {
      const progress = count(data.objetivos, tieneRespuestaPorcentaje);
      return { ...progress, missing: `Te ${progress.total - progress.done === 1 ? "falta" : "faltan"} ${plural(progress.total - progress.done, "objetivo", "objetivos")} por responder.` };
    }
    case 3: {
      const progress = count(data.cumplimiento_responsabilidades, tieneRespuestaPorcentaje);
      return { ...progress, missing: `Te ${progress.total - progress.done === 1 ? "falta" : "faltan"} ${plural(progress.total - progress.done, "responsabilidad", "responsabilidades")} por responder.` };
    }
    case 4: {
      const progress = count(data.competencias, item => item.evaluada === true);
      return { ...progress, missing: `Te ${progress.total - progress.done === 1 ? "falta" : "faltan"} ${plural(progress.total - progress.done, "competencia", "competencias")} por calificar.` };
    }
    default: {
      const required = calcularPonderacion(data).calificacionFinal < UMBRAL_CALIFICACION_APROBATORIA;
      return { done: !required || data.compromisos.trim() ? 1 : 0, total: 1, missing: `Captura los compromisos: la calificación es menor a ${UMBRAL_CALIFICACION_APROBATORIA}%.` };
    }
  }
}

export interface EvaluationFormProps {
  data: DesempenoData;
  onUpdate?: (data: DesempenoData) => void;
  onGuardar?: () => void;
  guardarDisabled?: boolean;
  guardarTooltip?: string;
}

export function useEvaluationForm({ data, onUpdate, onGuardar, guardarDisabled, guardarTooltip }: EvaluationFormProps) {
  const reducedMotion = useEvaluationReducedMotion();
  const [activeView, setActiveView] = useState(1);
  const [stepError, setStepError] = useState("");
  const headingId = useId();
  const identity = `${data.numero_empleado}:${data.periodo}`;

  const clearStepError = () => setStepError("");

  useEffect(() => {
    setActiveView(1);
    setStepError("");
  }, [identity]);

  const focusStep = () => requestAnimationFrame(() => {
    const heading = document.getElementById(headingId);
    heading?.focus({ preventScroll: true });
    const scrollContainer = heading?.closest<HTMLElement>("#main-content");
    const headingRect = heading?.getBoundingClientRect();
    const containerRect = scrollContainer?.getBoundingClientRect();

    if (!heading || !scrollContainer || !headingRect || !containerRect) return;

    const isOutsideContainer = headingRect.top < containerRect.top || headingRect.bottom > containerRect.bottom;
    if (isOutsideContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollTop + headingRect.top - containerRect.top,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    }
  });

  const goNextView = () => {
    const validation = validarEvaluacion(data);
    if (!validation.pasos[activeView - 1]) {
      // El mensaje se muestra junto a los botones y marca los campos pendientes.
      setStepError(stepProgress(data, activeView).missing);
      requestAnimationFrame(() => {
        const selector = activeView === 1
          ? '[aria-label="Evaluador"]'
          : activeView === 4
            ? '[data-competency-pending="true"] input[type="radio"]'
            : '[aria-invalid="true"]';
        (document.querySelector<HTMLElement>(selector) ?? document.getElementById(headingId))?.focus();
      });
      return;
    }
    clearStepError();
    setActiveView(value => Math.min(5, value + 1));
    focusStep();
  };

  const goPrevView = () => {
    clearStepError();
    setActiveView(value => Math.max(1, value - 1));
    focusStep();
  };

  /** Regresa a un paso ya recorrido desde la barra de pasos; hacia adelante se avanza con Siguiente. */
  const goToView = (view: number) => {
    if (view >= activeView) return;
    clearStepError();
    setActiveView(view);
    focusStep();
  };

  const handleEvaluadorChange = (nombre: string) => onUpdate?.({
    ...data,
    evaluador_nombre: nombre,
    evaluador_puesto: EVALUADORES_PUESTO[nombre] ?? "",
  });

  const updateObjetivo = (index: number, porcentaje: string, noAplica = false) => {
    const objetivos = data.objetivos.map((item, itemIndex) => itemIndex === index
      ? { ...item, porcentaje: noAplica ? "NA" : porcentaje, no_aplica: noAplica }
      : item);
    onUpdate?.({ ...data, objetivos });
  };

  const updateResponsabilidad = (index: number, porcentaje: string, noAplica = false) => {
    const cumplimiento_responsabilidades = data.cumplimiento_responsabilidades.map((item, itemIndex) => itemIndex === index
      ? { ...item, porcentaje: noAplica ? "NA" : porcentaje, no_aplica: noAplica }
      : item);
    onUpdate?.({ ...data, cumplimiento_responsabilidades });
  };

  const updateCompetencia = (index: number, calificacion: number) => {
    const competencias = data.competencias.map((item, itemIndex) => itemIndex === index
      ? { ...item, calificacion, evaluada: true }
      : item);
    onUpdate?.({ ...data, competencias });
  };

  const updateReview = (patch: Partial<Pick<DesempenoData, "compromisos" | "fecha_revision" | "observaciones">>) => {
    onUpdate?.({ ...data, ...patch });
  };

  const ponderacion = calcularPonderacion(data);
  return {
    data,
    onUpdate,
    onGuardar,
    guardarDisabled,
    guardarTooltip,
    activeView,
    setActiveView,
    goNextView,
    goPrevView,
    goToView,
    progress: stepProgress(data, activeView),
    headingId,
    stepError,
    setStepError,
    ponderacion,
    canEdit: Boolean(onUpdate),
    faltaEvaluador: !data.evaluador_nombre,
    isObjetivosCompletado: data.objetivos.length > 0 && data.objetivos.every(tieneRespuestaPorcentaje),
    isResponsabilidadesCompletado: data.cumplimiento_responsabilidades.length > 0 && data.cumplimiento_responsabilidades.every(tieneRespuestaPorcentaje),
    isCompetenciasCompletado: data.competencias.length > 0 && data.competencias.every(item => item.evaluada === true),
    handleEvaluadorChange,
    updateObjetivo,
    updateResponsabilidad,
    updateCompetencia,
    updateReview,
  };
}

export type EvaluationFormContext = ReturnType<typeof useEvaluationForm>;
