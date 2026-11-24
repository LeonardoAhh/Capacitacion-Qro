import { getPeriodoActual } from "@/lib/catalogo"

/**
 * Recepción de físicos de las evaluaciones semestrales. Es también la única
 * ventana en la que se capturan: la del periodo DIC-MAY, del 1 al 15 de junio;
 * la de JUN-NOV, del 1 al 15 de diciembre. Fuera de ella, la captura pasa a
 * Regularización (la fecha límite en SQL usa los mismos días).
 */
const MES_RECEPCION = { "DIC-MAY": 5, "JUN-NOV": 11 } as const
const DIA_INICIO = 1
const DIA_FIN = 15

const soloFecha = (fecha: Date) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())

export function getVentanaEntrega(periodo: string, fecha = new Date()) {
  const match = /^(DIC-MAY|JUN-NOV) (\d{4})$/.exec(periodo)
  if (!match) return null

  const mes = MES_RECEPCION[match[1] as keyof typeof MES_RECEPCION]
  const year = Number(match[2])
  const inicio = new Date(year, mes, DIA_INICIO)
  const fin = new Date(year, mes, DIA_FIN)
  const hoy = soloFecha(fecha)
  const estado = hoy < inicio ? "Próxima" : hoy > fin ? "Concluida" : "En curso"

  return { inicio, fin, estado }
}

/** Semestre cuya recepción está en curso, o null fuera de las ventanas. */
export function semestreEnEntrega(fecha = new Date()): string | null {
  if (fecha.getDate() < DIA_INICIO || fecha.getDate() > DIA_FIN) return null
  const rango = (Object.keys(MES_RECEPCION) as (keyof typeof MES_RECEPCION)[])
    .find(key => MES_RECEPCION[key] === fecha.getMonth())
  return rango ? `${rango} ${fecha.getFullYear()}` : null
}

/**
 * Semestre que corresponde evaluar: durante la recepción, el que acaba de cerrar;
 * fuera de ella, el que está en curso (se entregará en su próxima recepción).
 */
export function semestreAEvaluar(fecha = new Date()): string {
  return semestreEnEntrega(fecha) ?? getPeriodoActual("semestrales", fecha)
}
