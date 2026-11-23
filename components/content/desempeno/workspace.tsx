"use client";

import type { ReactNode } from "react";
import { evaluationStyles } from "./presentation";

/**
 * Marco de las vistas de evaluación. La navegación entre vistas vive en la barra
 * lateral (lib/navigation); aquí solo van las acciones de la vista: `start` a la
 * izquierda y `actions` a la derecha.
 */
export function EvaluationWorkspace({
  start,
  actions,
  children
}: {
  start?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return <div className={evaluationStyles.page}>
    {(start || actions) && <header className="flex flex-wrap items-center justify-between gap-2 print:hidden">
      <div className="flex items-center gap-2">{start}</div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{actions}</div>
    </header>}
    {children}
  </div>;
}
