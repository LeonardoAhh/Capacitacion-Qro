/**
 * Rutas y años del Plan Anual. Sin dependencias de datos: lo usan también las
 * páginas del servidor para validar el año de la URL.
 */
export const PLAN_YEAR_MIN = 2000
export const PLAN_YEAR_MAX = 2100

/** Año válido para el plan (p. ej. el de una URL); null si no lo es. */
export function anioPlan(value: string | undefined): number | null {
  const anio = Number(value)
  return Number.isInteger(anio) && anio >= PLAN_YEAR_MIN && anio <= PLAN_YEAR_MAX ? anio : null
}

/** Mes válido (1 a 12); null si no lo es. */
export function mesPlan(value: string | undefined): number | null {
  const mes = Number(value)
  return Number.isInteger(mes) && mes >= 1 && mes <= 12 ? mes : null
}

/** Plan en un año y mes: a donde se vuelve desde sus páginas de captura. */
export function rutaPlan(anio: number, mes?: number): string {
  return `/plan-anual?anio=${anio}${mes ? `&mes=${mes}` : ""}`
}

export const rutaCursosFijos = (anio: number) => `/plan-anual/cursos-fijos/${anio}`
export const rutaImportarDnc = (anio: number) => `/plan-anual/importar-dnc/${anio}`
