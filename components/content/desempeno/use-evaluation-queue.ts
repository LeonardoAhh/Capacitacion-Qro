"use client";

import { useEffect, useMemo, useState } from "react";
import { getPeriodosSemestralesRecientes } from "@/lib/catalogo";
import { pendingEvalStatus } from "@/lib/desempeno/pending-status";
import { useSemestralPendientes } from "@/lib/hooks/useSemestralPendientes";
import type { EvaluationSearchContext } from "./use-evaluation-search";

export interface QueueItem {
  numero: string;
  nombre: string;
  /** Tipo y periodo de la evaluación, p. ej. "Nuevo ingreso · 2° Mes". */
  tipo: string;
  detalle: string | null;
}

/**
 * Personas que el evaluador puede evaluar hoy, en orden de atención: primero
 * nuevo ingreso dentro de su ventana (la más antigua primero) y después las
 * semestrales del periodo en curso. Las atrasadas no entran: requieren
 * regularización con Recursos Humanos y solo se cuentan.
 */
export function useEvaluationQueue(context: EvaluationSearchContext, enabled: boolean) {
  const periodoSemestral = getPeriodosSemestralesRecientes()[0];
  const semestrales = useSemestralPendientes(periodoSemestral, null, enabled);
  const { deptGroups, pendingLoading, totalVencidas, saveSuccess, data } = context;
  // Las listas se cargan una vez; quien se evalúa en esta sesión sale de la fila sin recargar.
  const [completed, setCompleted] = useState<string[]>([]);
  const savedNumero = saveSuccess ? data?.numero_empleado : undefined;
  useEffect(() => {
    if (savedNumero) setCompleted(current => current.includes(savedNumero) ? current : [...current, savedNumero]);
  }, [savedNumero]);

  const items = useMemo<QueueItem[]>(() => {
    const nuevoIngreso = deptGroups.flatMap(group => group.items.flatMap(employee => {
      const ready = employee.evals
        .filter(entry => pendingEvalStatus(entry.diasDiff, entry.numeroEvaluacion) === "proximas")
        .sort((a, b) => b.diasDiff - a.diasDiff)[0];
      return ready && employee.numero
        ? [{ item: { numero: employee.numero, nombre: employee.nombre, tipo: `Nuevo ingreso · ${ready.periodo}`, detalle: employee.departamento }, order: ready.diasDiff }]
        : [];
    })).sort((a, b) => b.order - a.order).map(({ item }) => item);

    const semestral = semestrales.deptGroups.flatMap(group => group.items)
      .filter(employee => employee.estado === "pendiente" && employee.numero)
      .map(employee => ({ numero: employee.numero as string, nombre: employee.nombre, tipo: `Semestral · ${periodoSemestral}`, detalle: employee.puesto }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    const seen = new Set<string>(completed);
    return [...nuevoIngreso, ...semestral].filter(item => !seen.has(item.numero) && seen.add(item.numero));
  }, [deptGroups, semestrales.deptGroups, periodoSemestral, completed]);

  // Siguiente persona al terminar: la primera de la fila que no sea la que se está evaluando.
  const next = items.find(item => item.numero !== data?.numero_empleado) ?? null;

  return { items, next, loading: pendingLoading || semestrales.loading, overdue: totalVencidas };
}
