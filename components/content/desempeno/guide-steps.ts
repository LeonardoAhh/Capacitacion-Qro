import { DESEMPENO, EVALUATION_STEPS, EVALUATION_WEIGHTS } from "@/lib/desempeno/presentation";
import { UMBRAL_CALIFICACION_APROBATORIA } from "@/lib/types/desempeno";

export interface GuideStep {
  id: string;
  label: string;
  title: string;
  description: string;
  instructions: readonly string[];
  note: string;
  weights?: readonly { label: string; value: number }[];
}

export const GUIDE_COPY = {
  title: `${DESEMPENO.actions.guide} de evaluación`,
  description: "Consulta cómo buscar, evaluar y entregar el formato.",
  navigation: "Pasos de la guía",
  close: "Cerrar guía",
  previous: "Anterior",
  next: DESEMPENO.actions.next,
  finish: "Entendido",
  reminder: "Ten en cuenta",
  weights: "Peso en la calificación final",
  preview: "Vista de referencia",
  details: "Ver instrucciones y recomendaciones",
  save: "Guardar",
  print: "Imprimir",
  saved: "Evaluación guardada",
  delivery: "Imprime, recolecta firmas y entrega a Capacitación.",
  step: (index: number, total: number) => `Paso ${index + 1} de ${total}`,
} as const;

export const GUIDE_STEPS: readonly GuideStep[] = [
{
  id: "search",
  label: "Buscar",
  title: "Busca al empleado",
  description: `Comienza en ${DESEMPENO.pages.evaluation.title}. Busca por número de empleado o nombre y selecciona a la persona que vas a evaluar.`,
  instructions: [
    DESEMPENO.search.help,
    "Elige una sugerencia de la lista o presiona Enter para cargar sus datos.",
    `Si quieres practicar antes, usa «Practicar»: es un ejemplo con datos de prueba que no se guarda en el sistema.`,
  ],
  note: `En la barra lateral encontrarás ${DESEMPENO.pages.evaluation.title} y ${DESEMPENO.pages.pending.title}.`,
},
{
  id: "period",
  label: "Periodo",
  title: "Revisa el periodo asignado",
  description: "El sistema asigna automáticamente el periodo a evaluar, tomando en cuenta la fecha de ingreso.",
  instructions: [
    "Si el periodo ya tiene una evaluación guardada, verás «Evaluación ya guardada» con su calificación; busca a otra persona para evaluar."
  ],
  note: "Las evaluaciones solo se registran en el periodo vigente. Si aparece «Regularización requerida», el periodo venció: acude a Recursos Humanos."
},
  {
  id: "evaluate",
  label: DESEMPENO.pages.evaluation.title,
  title: "Completa la evaluación",
  description: `Avanza por ${EVALUATION_STEPS.join(", ")} usando ${DESEMPENO.actions.next}.`,
  instructions: [
    `En ${EVALUATION_STEPS[0]}, verifica a la persona y el periodo, y selecciona al ${DESEMPENO.fields.evaluator.toLowerCase()} responsable.`,
    `En ${EVALUATION_STEPS[1]} y ${EVALUATION_STEPS[2]}, captura un valor de 0 a 100% o marca No aplica.`,
    `En ${EVALUATION_STEPS[3]}, selecciona una respuesta de 0 a 4; el cero es una calificación válida.`,
  ],
  weights: [
    { label: DESEMPENO.sections.objetivos, value: EVALUATION_WEIGHTS.objetivos },
    { label: DESEMPENO.sections.cumplimiento, value: EVALUATION_WEIGHTS.cumplimiento },
    { label: DESEMPENO.sections.competencias, value: EVALUATION_WEIGHTS.competencias },
  ],
  note: `Con ${DESEMPENO.actions.back} vuelves a un paso anterior sin perder la captura.`,
},
{
  id: "save",
  label: "Guardar",
  title: "Guarda la evaluación",
  description: `En ${EVALUATION_STEPS[4]}, revisa el resultado final y documenta el seguimiento.`,
  instructions: [
    `Captura ${DESEMPENO.fields.commitments}, ${DESEMPENO.fields.reviewDate} y, si hace falta, ${DESEMPENO.fields.observations}.`,
    `${DESEMPENO.actions.save} se habilita cuando completas los campos requeridos y hay un ${DESEMPENO.fields.evaluator.toLowerCase()} seleccionado.`,
    "Espera la confirmación «Evaluación guardada» antes de imprimir.",
  ],
  note: `Si la calificación final es menor a un ${UMBRAL_CALIFICACION_APROBATORIA}%, los compromisos son obligatorios para guardar.`,
},
{
  id: "print",
  label: "Entregar",
  title: "Imprime y entrega",
  description: "Con la evaluación guardada, genera el formato oficial y entrégalo firmado.",
  instructions: [
    "En la pantalla de confirmación, usa «Imprimir» para generar el formato RG-ADM-062 o RG-ADM-063.",
    "Recaba la firma del colaborador y fírmala tú también.",
    "Entrega el documento físico al departamento de Capacitación.",
  ],
  note: "Con «Evaluar otra persona» vuelves al buscador.",
}
];
