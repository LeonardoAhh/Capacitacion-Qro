export const PROMOTION_TABLE_COPY = {
  accessibleName: "Seguimiento de promociones",
  employee: "Empleado",
  department: "Departamento",
  tenure: "Temporalidad",
  tenureHelp: "Tiempo en el puesto actual",
  courses: "Cursos",
  performance: "Desempeño",
  exam: "Examen",
  status: "Estado",
  actions: "Acciones",
  unavailableGroup: "Categoría A o sin categoría",
  noEvaluation: "Sin evaluar",
  unavailableValue: "—",
  notApplicable: "No aplica",
  required: "Requerido",
  minimum: "mín",
  meets: "Cumple",
  doesNotMeet: "No cumple",
} as const

export function getUnavailableCategoryLabel(position: string): string {
  return /\sA$/i.test(position.trim()) ? "Categoría A" : "Sin categoría"
}

/** Solo lo que no cumple se resalta; lo demás queda neutro para no saturar la tabla. */
export function getCriterionTone(result: boolean | null): string {
  return result === false ? "text-destructive" : "text-foreground"
}
