/** Recepción física: la del periodo DIC–MAY, del 1 al 15 de junio; la de JUN–NOV, del 1 al 15 de diciembre. */
export function getVentanaEntrega(periodo: string, fecha = new Date()) {
  const match = /^(DIC-MAY|JUN-NOV) (\d{4})$/.exec(periodo)
  if (!match) return null

  const year = Number(match[2])
  const mes = match[1] === "DIC-MAY" ? 5 : 11
  const inicio = new Date(year, mes, 1)
  const fin = new Date(year, mes, 15)
  const hoy = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  const estado = hoy < inicio ? "Próxima" : hoy > fin ? "Concluida" : "En curso"

  return { inicio, fin, estado }
}
