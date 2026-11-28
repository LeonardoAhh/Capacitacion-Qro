/**
 * Reporte semanal de Safe Walk para dirección, gerencia y jefaturas: cifras de la semana,
 * hallazgos por departamento y el detalle de cada hallazgo con sus fotos y su cierre.
 */
import type jsPDF from "jspdf"
import type { FindingPreview } from "@/components/content/safety-home/finding-constraints"
import { findingDueDate, isFindingOverdue } from "@/components/content/safety-home/finding-constraints"
import { isPdfPath } from "@/components/content/safety-home/finding-file-types"
import { hoyISO, isoATexto, semanaIso } from "@/lib/fechas"
import {
  crearReporte, encabezadoRegistro, etiqueta, fechaLarga, fotos, parrafo, seccion, separador, tabla, titulo,
} from "./pdf-base"

/** En español: el reporte lo leen dirección, gerencia y jefaturas (Safe Walk en el sistema). */
export const SAFE_WALK_MODULO = "Recorridos de seguridad"

export function nombreArchivoSafeWalk(lunes: string) {
  const { semana, anio } = semanaIso(lunes)
  return `recorridos-de-seguridad-semana-${semana}-${anio}.pdf`
}

/** Hallazgos de la semana, del más antiguo al más reciente (como sucedieron). */
const ordenar = (hallazgos: FindingPreview[]) =>
  [...hallazgos].sort((a, b) => a.date.split("/").reverse().join("").localeCompare(b.date.split("/").reverse().join("")))

export async function crearReporteSafeWalk(hallazgos: FindingPreview[], lunes: string): Promise<jsPDF> {
  const { semana, anio } = semanaIso(lunes)
  const reporte = await crearReporte({ modulo: SAFE_WALK_MODULO, semana, anio, lunes })
  const lista = ordenar(hallazgos)

  // La semana va en el encabezado de cada página; aquí solo cuándo se generó.
  titulo(reporte, "Reporte semanal de recorridos de seguridad", [`Generado el ${fechaLarga(hoyISO())}`])

  if (lista.length === 0) {
    parrafo(reporte, "No se registraron hallazgos esta semana.", { color: "muted" })
    return reporte.finalizar()
  }

  // Resumen de la semana por departamento.
  const departamentos = [...new Set(lista.map(hallazgo => hallazgo.area))].sort((a, b) => a.localeCompare(b, "es-MX"))
  seccion(reporte, "Por departamento")
  tabla(reporte,
    [{ titulo: "Departamento" }, { titulo: "Abiertos", numerica: true }, { titulo: "En seguimiento", numerica: true },
      { titulo: "Cerrados", numerica: true }, { titulo: "Vencidos", numerica: true }],
    departamentos.map(departamento => {
      const suyos = lista.filter(hallazgo => hallazgo.area === departamento)
      const contar = (estado: FindingPreview["status"]) => String(suyos.filter(hallazgo => hallazgo.status === estado).length)
      return [departamento, contar("Abierto"), contar("En seguimiento"), contar("Cerrado"), String(suyos.filter(hallazgo => isFindingOverdue(hallazgo)).length)]
    }),
  )

  seccion(reporte, "Detalle de hallazgos")
  for (const [index, hallazgo] of lista.entries()) {
    const vencido = isFindingOverdue(hallazgo)
    const limite = findingDueDate(hallazgo)
    encabezadoRegistro(reporte, {
      titulo: `${index + 1}. ${hallazgo.title}`,
      marca: vencido ? "Vencido" : hallazgo.status,
      marcaAlerta: vencido,
      datos: [
        { label: "Departamento", value: hallazgo.area },
        { label: "Responsable", value: hallazgo.responsible || "Sin asignar" },
        { label: "Fecha", value: hallazgo.date },
        { label: "Plazo", value: hallazgo.deadline ? `${hallazgo.deadline}${limite ? ` · vence ${isoATexto(limite)}` : ""}` : "Sin plazo" },
      ],
    })
    parrafo(reporte, hallazgo.description)

    if (hallazgo.evidences?.length) {
      etiqueta(reporte, "Evidencia")
      await fotos(reporte, hallazgo.evidences)
    }

    // Cierre: las fotos van en la rejilla; los PDF no se pueden incrustar y se indica que existen.
    const cierre = hallazgo.completionEvidencePaths.map((path, i) => ({ path, url: hallazgo.completionEvidences?.[i] ?? "" }))
    const fotosCierre = cierre.filter(item => item.url && !isPdfPath(item.path)).map(item => item.url)
    const pdfsCierre = cierre.filter(item => isPdfPath(item.path)).length
    if (fotosCierre.length || pdfsCierre) {
      etiqueta(reporte, "Cierre")
      if (fotosCierre.length) await fotos(reporte, fotosCierre)
      if (pdfsCierre) {
        parrafo(reporte, pdfsCierre === 1 ? "Incluye 1 documento PDF de cierre, disponible en el sistema." : `Incluye ${pdfsCierre} documentos PDF de cierre, disponibles en el sistema.`, { size: 8.5, color: "muted" })
      }
    }
    separador(reporte)
  }

  return reporte.finalizar()
}
