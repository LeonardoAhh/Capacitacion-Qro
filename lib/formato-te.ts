/**
 * Formato TE (solicitud de autorización de tiempo extraordinario): datos de la captura, cálculo
 * de horas y reparto en hojas. Sin React; la página está en components/content/formato-te.
 */

export const FORMATO_TE_PATH = "/formato-te"

/** Filas que caben en una hoja impresa del formato. */
export const FILAS_POR_HOJA = 10

/** Textos fijos del formato impreso, tal como el formato en papel. */
export const FORMATO_TE_TEXTOS = {
  titulo: "FORMATO DE SOLICITUD DE AUTORIZACIÓN DE TIEMPO EXTRAORDINARIO",
  solicitud: "Por medio del presente atentamente solicito, se me tenga a bien autorizar laborar el siguiente tiempo extraordinario, en términos de lo establecido en el Artículo 66 de la Ley Federal del Trabajo.",
  ratificacion: "Firman los trabajadores que trabajarán tiempo extra, ratificando que es su voluntad y están de acuerdo en trabajar el tiempo extra solicitado:",
  motivos: "Mencione los motivos por los cuales es necesario laborar Tiempo Extraordinario:",
  firmas: [
    { nombre: "", cargo: "Nombre y firma del jefe directo" },
    { nombre: "", cargo: "Recursos Humanos" },
    { nombre: "", cargo: "Gerencia de Planta" },
    { nombre: "José Luis Viñolas González", cargo: "Dirección General" },
  ],
} as const

/** Horario "HH:MM" (como lo da un input de hora) con su inicio y fin. */
export interface Jornada {
  inicio: string
  fin: string
}

export interface FilaTE {
  id: string
  numero: string
  nombre: string
  puesto: string | null
  /** AAAA-MM-DD */
  fecha: string
  ordinaria: Jornada
  extraordinaria: Jornada
}

/** Lo que se aplica a cada empleado que se agrega; se cambia una vez y sirve para toda la tanda. */
export interface ValoresCaptura {
  fecha: string
  ordinaria: Jornada
  extraordinaria: Jornada
}

const minutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
}

/** Horas entre inicio y fin; si el fin es menor, cruza la medianoche. null si falta un dato. */
export function horasDe(jornada: Jornada): number | null {
  const inicio = minutos(jornada.inicio)
  const fin = minutos(jornada.fin)
  if (inicio === null || fin === null || inicio === fin) return null
  return ((fin - inicio + 24 * 60) % (24 * 60)) / 60
}

/** Escribe la jornada solo con números: "06001400" queda "06:00-14:00" (dos puntos y guion solos). */
export function enmascararJornada(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 8)
  let salida = d.slice(0, 2)
  if (d.length > 2) salida += `:${d.slice(2, 4)}`
  if (d.length > 4) salida += `-${d.slice(4, 6)}`
  if (d.length > 6) salida += `:${d.slice(6, 8)}`
  return salida
}

/** "06:00-14:00" a su inicio y fin; null si está incompleta o no es una hora válida. */
export function textoAJornada(texto: string): Jornada | null {
  const partes = texto.match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/)
  if (!partes) return null
  const [, h1, m1, h2, m2] = partes.map(Number)
  if ([h1, h2].some(h => h > 23) || [m1, m2].some(m => m > 59)) return null
  return { inicio: `${partes[1]}:${partes[2]}`, fin: `${partes[3]}:${partes[4]}` }
}

/** Texto del campo para una jornada guardada ("06:00-14:00"); vacío si falta. */
export function jornadaATexto({ inicio, fin }: Jornada): string {
  return inicio && fin ? `${inicio}-${fin}` : ""
}

/** "6:00-14:00", como en el formato impreso. */
export function textoJornada({ inicio, fin }: Jornada): string {
  const corta = (hora: string) => hora.replace(/^0(\d)/, "$1")
  return inicio && fin ? `${corta(inicio)}-${corta(fin)}` : ""
}

/** 1, 1.5, 2.25: sin ceros de más. */
export function textoHoras(horas: number): string {
  return String(Math.round(horas * 100) / 100)
}

export function totalHoras(filas: readonly FilaTE[]): number {
  return filas.reduce((total, fila) => total + (horasDe(fila.extraordinaria) ?? 0), 0)
}

/** Filas en hojas de 10, en el orden en que se capturaron. */
export function enHojas<T>(filas: readonly T[]): T[][] {
  const hojas: T[][] = []
  for (let i = 0; i < filas.length; i += FILAS_POR_HOJA) hojas.push(filas.slice(i, i + FILAS_POR_HOJA))
  return hojas
}

// ── Borrador: la captura sobrevive a recargar o cambiar de página ──

const BORRADOR_KEY = "formato-te:borrador"

export interface BorradorTE {
  valores: ValoresCaptura
  filas: FilaTE[]
  /** Se imprime al pie de cada hoja. */
  motivos: string
}

export function leerBorrador(): BorradorTE | null {
  try {
    const guardado = window.localStorage.getItem(BORRADOR_KEY)
    return guardado ? JSON.parse(guardado) as BorradorTE : null
  } catch {
    return null
  }
}

export function guardarBorrador(borrador: BorradorTE) {
  try {
    window.localStorage.setItem(BORRADOR_KEY, JSON.stringify(borrador))
  } catch {
    // Sin almacenamiento: la captura sigue, solo no se recupera al recargar.
  }
}
