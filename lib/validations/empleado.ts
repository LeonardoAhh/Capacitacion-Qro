/** Reglas de captura de los datos de un empleado, iguales en todos los formularios. */

export const NUMERO_EMPLEADO_MAX = 5

/** Solo dígitos, hasta 5 (también al pegar). */
export const limpiarNumeroEmpleado = (valor: string) => valor.replace(/\D/g, "").slice(0, NUMERO_EMPLEADO_MAX)

/** Solo letras (con acentos y ñ), espacios, apóstrofo y guion; sin espacios dobles. */
export const limpiarNombre = (valor: string) => valor.replace(/[^\p{L}\p{M} '-]/gu, "").replace(/ {2,}/g, " ")
