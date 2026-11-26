"use client";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Número de empleado para mostrar; sin número capturado lo dice en texto. */
export function numeroLabel(numero: string | null | undefined): string {
  return numero ? `#${numero}` : "Sin número";
}
export const MESES_ES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"] as const;
export function periodoLabel(fechaIso: string): string {
  const m = Number(fechaIso.split("-")[1]); // 1-indexed
  const start = m === 1 ? 12 : m - 1;
  return `${MESES_ES[start - 1]} – ${MESES_ES[m - 1]}`;
}
