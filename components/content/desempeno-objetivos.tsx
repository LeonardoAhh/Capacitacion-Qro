"use client";

import { EvaluationWorkspace } from "./desempeno/workspace";
import { ObjectivesCatalog } from "./desempeno/objectives-catalog";

/** Objetivos: catálogo de objetivos SMART por puesto. */
export default function DesempenoObjetivos() {
  return <EvaluationWorkspace>
    <ObjectivesCatalog />
  </EvaluationWorkspace>;
}
