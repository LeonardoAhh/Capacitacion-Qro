/** Pestañas de /examenes; la URL puede abrir una con ?tab= (p. ej. al volver de una hoja de respuestas). */
export const EXAMENES_TABS = ["generador", "historial", "banco", "reglas"] as const
export type ExamenesTab = (typeof EXAMENES_TABS)[number]

export const EXAMENES_PATH = "/examenes"
export const EXAMENES_HISTORIAL_HREF = `${EXAMENES_PATH}?tab=historial`

export function examenHojaHref(id: string) {
  return `${EXAMENES_PATH}/${encodeURIComponent(id)}`
}

export function toExamenesTab(value: unknown): ExamenesTab {
  return EXAMENES_TABS.includes(value as ExamenesTab) ? value as ExamenesTab : "generador"
}
