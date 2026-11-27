/**
 * Reporte semanal de Occupational Health: cifras de la semana y el detalle de cada accidente
 * (persona, atención, incapacidad y seguimiento). Va aparte del de Safe Walk.
 */
import type jsPDF from "jspdf"
import { hoyISO, isoATexto, semanaIso, sumarDias } from "@/lib/fechas"
import { ATENCIONES, racha, SEGUIMIENTO, SEVERIDADES, type Accidente } from "@/lib/salud-ocupacional"
import { cifras, crearReporte, encabezadoRegistro, fechaLarga, parrafo, seccion, separador, titulo } from "./pdf-base"

/** En español: el reporte lo leen dirección, gerencia y jefaturas (Occupational Health en el sistema). */
export const ACCIDENTES_MODULO = "Salud ocupacional"

export function nombreArchivoAccidentes(lunes: string) {
  const { semana, anio } = semanaIso(lunes)
  return `salud-ocupacional-semana-${semana}-${anio}.pdf`
}

const siNo = (valor: boolean | null) => valor === null ? "—" : valor ? "Sí" : "No"
const dias = (valor: number) => `${valor} ${valor === 1 ? "día" : "días"}`

/**
 * @param todos Historial completo: los días sin accidentes se cuentan hasta el cierre de la semana.
 */
export async function crearReporteAccidentes(todos: Accidente[], lunes: string): Promise<jsPDF> {
  const { semana, anio } = semanaIso(lunes)
  const domingo = sumarDias(lunes, 6)
  const hoy = hoyISO()
  const corte = domingo < hoy ? domingo : hoy
  const lista = todos.filter(accidente => accidente.fecha >= lunes && accidente.fecha <= domingo)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
  const reporte = await crearReporte({ modulo: ACCIDENTES_MODULO, semana, anio, lunes })

  // La semana va en el encabezado de cada página; aquí solo cuándo se generó.
  titulo(reporte, "Reporte semanal de salud ocupacional", [`Generado el ${fechaLarga(hoy)}`])

  const conIncapacidad = lista.filter(accidente => accidente.incapacidad)
  cifras(reporte, [
    { label: "Accidentes", value: lista.length, alerta: lista.length > 0 },
    { label: "Riesgo de trabajo", value: lista.filter(accidente => accidente.riesgoTrabajo).length },
    { label: "Con incapacidad", value: conIncapacidad.length },
    { label: "Días de incapacidad", value: conIncapacidad.reduce((total, accidente) => total + (accidente.diasIncapacidad ?? 0), 0) },
    { label: "Días sin accidentes", value: racha(todos, corte).actual },
  ])

  if (lista.length === 0) {
    parrafo(reporte, "No se registraron accidentes esta semana.", { color: "muted" })
    return reporte.finalizar()
  }

  seccion(reporte, "Detalle de accidentes")
  for (const [index, accidente] of lista.entries()) {
    const atenciones = ATENCIONES.filter(atencion => accidente.atenciones.includes(atencion.value))
    encabezadoRegistro(reporte, {
      titulo: `${index + 1}. ${accidente.colaborador}`,
      marca: SEVERIDADES.find(severidad => severidad.value === accidente.severidad)?.label ?? "Sin severidad",
      marcaAlerta: accidente.severidad === "alta",
      datos: [
        { label: "Número de empleado", value: accidente.numeroEmpleado },
        { label: "Fecha", value: isoATexto(accidente.fecha) },
        { label: "Riesgo de trabajo", value: siNo(accidente.riesgoTrabajo) },
        { label: "Incapacidad", value: accidente.incapacidad && accidente.diasIncapacidad ? dias(accidente.diasIncapacidad) : siNo(accidente.incapacidad) },
        { label: "Atención", value: atenciones.map(atencion => atencion.label).join(", ") || "Sin atención" },
        { label: "Reposo", value: accidente.diasReposo ? `${dias(accidente.diasReposo)}${accidente.reposoConGoce ? " con goce" : " sin goce"}` : "—" },
        { label: "Reporte de incidente", value: siNo(accidente.reporteGenerado) },
      ],
    })
    parrafo(reporte, accidente.descripcion)

    // Seguimiento según dónde se atendió (clínica: requisición y pago; IMSS: ST7 y ST2).
    const pasos = atenciones.flatMap(atencion => SEGUIMIENTO[atencion.value] ?? [])
    if (pasos.length) {
      parrafo(reporte, pasos.map(paso => `${paso.label}: ${accidente[paso.key] ? "listo" : "pendiente"}`).join(" · "), { size: 8.5, color: "muted" })
    }
    separador(reporte)
  }

  return reporte.finalizar()
}
