/** Rutas de /plantilla y sus páginas de detalle. */
export const PLANTILLA_PATH = "/plantilla"

export function puestoCursosHref(puestoId: string) {
  return `${PLANTILLA_PATH}/puestos/${encodeURIComponent(puestoId)}`
}

/** Apartados de la página de registros de un empleado, en el orden de su navegación interna. */
export const REGISTROS_SECCIONES = ["incidencias", "actas", "incumplimientos", "retardos", "omisiones", "accidentes"] as const
export type RegistrosSeccion = (typeof REGISTROS_SECCIONES)[number]

export function isRegistrosSeccion(value: unknown): value is RegistrosSeccion {
  return typeof value === "string" && (REGISTROS_SECCIONES as readonly string[]).includes(value)
}

/** Registros de un empleado (incidencias, actas, incumplimientos, retardos, omisiones, accidentes) en un apartado. */
export function registrosEmpleadoHref(numero: string, seccion: RegistrosSeccion, origen?: string) {
  const query = new URLSearchParams({ seccion, ...(origen ? { origen } : {}) })
  return `${PLANTILLA_PATH}/empleado/${encodeURIComponent(numero)}?${query}`
}
