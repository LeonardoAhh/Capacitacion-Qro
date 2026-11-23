/** Rutas de /plantilla y sus páginas de detalle. */
export const PLANTILLA_PATH = "/plantilla"

export function puestoCursosHref(puestoId: string) {
  return `${PLANTILLA_PATH}/puestos/${encodeURIComponent(puestoId)}`
}
