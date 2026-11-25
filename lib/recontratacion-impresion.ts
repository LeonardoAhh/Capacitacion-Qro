/**
 * Opciones del formato de recontratación que se eligen en el modal antes de imprimir.
 */
export type RespuestaFormato = "SI" | "NO" | "BLANCO"

export interface OpcionesImpresion {
  /** RG-REC-048 requisitado y entregado. */
  rg: RespuestaFormato
  /** ¿Autoriza contrato indeterminado? */
  autoriza: RespuestaFormato
  /** "El área no entregó" en evaluaciones sin calificación. */
  observacion: boolean
}

export const OPCIONES_IMPRESION_INICIALES: OpcionesImpresion = { rg: "BLANCO", autoriza: "BLANCO", observacion: true }

export const RESPUESTAS_FORMATO: readonly { value: RespuestaFormato; label: string }[] = [
  { value: "SI", label: "Sí" },
  { value: "NO", label: "No" },
  { value: "BLANCO", label: "En blanco" },
]

/** Texto que va en el documento: "SI", "NO" o vacío (se imprime "SI / NO" para llenarlo a mano). */
export const textoFormato = (value: RespuestaFormato) => value === "BLANCO" ? "" : value
