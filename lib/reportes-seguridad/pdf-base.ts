/**
 * Base de los reportes semanales de Seguridad e Higiene (PDF, tamaño carta).
 *
 * Estilo de documento impreso, no de pantalla: tinta sobre blanco, líneas finas y
 * jerarquía tipográfica con Inter (la fuente de impresión del sistema, lib/print-font).
 * El único color es el de alerta (p. ej. hallazgos vencidos). Los colores van aquí
 * como constantes porque jsPDF no lee los tokens CSS de la interfaz.
 */
import jsPDF from "jspdf"
import autoTable, { type RowInput } from "jspdf-autotable"
import { COMPANY_NAME } from "@/lib/constants/company"
import { deISO, sumarDias } from "@/lib/fechas"
import { PRINT_FONT_FAMILY, registerPrintFont } from "@/lib/print-font"

export const PAGE = { width: 215.9, height: 279.4, margin: 16 } as const
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2
/** Debajo del encabezado de cada página. */
const TOP = 30
/** Arriba del pie de página. */
const BOTTOM = PAGE.height - 18

const COLOR = {
  ink: "#16191d",
  muted: "#5f6670",
  rule: "#d4d8de",
  alert: "#b42318",
  placeholder: "#f1f3f5",
} as const

const PT_TO_MM = 0.3528
const lineHeight = (sizePt: number, leading = 1.35) => sizePt * PT_TO_MM * leading

const FECHA_LARGA = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" })
const DIA_MES = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long" })

export const fechaLarga = (iso: string) => FECHA_LARGA.format(deISO(iso))

/** "23 al 29 de noviembre de 2026" (o con ambos meses si la semana los cruza). */
export function rangoSemana(lunes: string): string {
  const domingo = sumarDias(lunes, 6)
  const mismoMes = lunes.slice(0, 7) === domingo.slice(0, 7)
  const inicio = mismoMes ? String(deISO(lunes).getDate()) : DIA_MES.format(deISO(lunes))
  return `${inicio} al ${fechaLarga(domingo)}`
}

// ── Imágenes ────────────────────────────────────────────────────────────────

async function blobDeUrl(url: string): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No se pudo descargar la imagen (${response.status})`)
  return response.blob()
}

/**
 * Foto para el PDF: recortada al centro a la proporción de su celda y comprimida a JPEG,
 * para que el archivo no pese de más. Null si no se pudo cargar.
 */
export async function fotoParaPdf(url: string, proporcion: number, anchoMax = 1000): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(await blobDeUrl(url))
    const fuenteProporcion = bitmap.width / bitmap.height
    const recorte = fuenteProporcion > proporcion
      ? { w: bitmap.height * proporcion, h: bitmap.height }
      : { w: bitmap.width, h: bitmap.width / proporcion }
    const ancho = Math.min(anchoMax, Math.round(recorte.w))
    const canvas = document.createElement("canvas")
    canvas.width = ancho
    canvas.height = Math.round(ancho / proporcion)
    const context = canvas.getContext("2d")
    if (!context) return null
    context.drawImage(bitmap, (bitmap.width - recorte.w) / 2, (bitmap.height - recorte.h) / 2, recorte.w, recorte.h, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return canvas.toDataURL("image/jpeg", 0.72)
  } catch {
    return null
  }
}

/** Logo de la empresa sin el margen blanco del archivo, para que se alinee con el texto. */
async function logoRecortado(): Promise<{ data: string; proporcion: number } | null> {
  try {
    const bitmap = await createImageBitmap(await blobDeUrl("/logo-vino-plastic.png"))
    const canvas = document.createElement("canvas")
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext("2d")
    if (!context) return null
    context.drawImage(bitmap, 0, 0)
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
    let [minX, minY, maxX, maxY] = [canvas.width, canvas.height, 0, 0]
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4
        const fondo = data[i + 3] < 20 || (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235)
        if (!fondo) {
          minX = Math.min(minX, x); minY = Math.min(minY, y)
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
        }
      }
    }
    if (maxX <= minX || maxY <= minY) return null
    const recorte = document.createElement("canvas")
    recorte.width = maxX - minX + 1
    recorte.height = maxY - minY + 1
    recorte.getContext("2d")?.drawImage(canvas, minX, minY, recorte.width, recorte.height, 0, 0, recorte.width, recorte.height)
    bitmap.close()
    return { data: recorte.toDataURL("image/png"), proporcion: recorte.width / recorte.height }
  } catch {
    return null
  }
}

// ── Documento ───────────────────────────────────────────────────────────────

export interface ReportePdf {
  doc: jsPDF
  /** Posición vertical actual (mm). */
  y: number
  /** Dibuja el encabezado (logo, módulo y semana) en la página actual. */
  encabezado: () => void
  /** Pone el pie con número de página en todas las hojas y devuelve el documento. */
  finalizar: () => jsPDF
}

interface Encabezado {
  /** Nombre corto del módulo para el encabezado y el pie (p. ej. "Safe Walk"). */
  modulo: string
  semana: number
  anio: number
  lunes: string
}

/** Crea el documento carta con la fuente de impresión y el encabezado en cada página nueva. */
export async function crearReporte(encabezado: Encabezado): Promise<ReportePdf> {
  const doc = new jsPDF({ unit: "mm", format: "letter" })
  // Título del archivo: lo muestran el visor del navegador y los lectores de PDF en lugar del identificador interno.
  doc.setProperties({ title: `${encabezado.modulo} · S${encabezado.semana} ${encabezado.anio}`, author: COMPANY_NAME, creator: COMPANY_NAME })
  doc.viewerPreferences({ DisplayDocTitle: true })
  const [logo] = await Promise.all([logoRecortado(), registerPrintFont(doc)])
  const dibujarEncabezado = () => {
    if (logo) {
      const alto = 9
      doc.addImage(logo.data, "PNG", PAGE.margin, 10, alto * logo.proporcion, alto)
    }
    doc.setFont(PRINT_FONT_FAMILY, "bold").setFontSize(9).setTextColor(COLOR.ink)
    doc.text(encabezado.modulo, PAGE.width - PAGE.margin, 13.5, { align: "right" })
    doc.setFont(PRINT_FONT_FAMILY, "normal").setFontSize(8).setTextColor(COLOR.muted)
    doc.text(`Semana ${encabezado.semana} · ${rangoSemana(encabezado.lunes)}`, PAGE.width - PAGE.margin, 18, { align: "right" })
    doc.setDrawColor(COLOR.rule).setLineWidth(0.2)
    doc.line(PAGE.margin, 22.5, PAGE.width - PAGE.margin, 22.5)
  }
  dibujarEncabezado()

  const finalizar = () => {
    const total = doc.getNumberOfPages()
    for (let pagina = 1; pagina <= total; pagina++) {
      doc.setPage(pagina)
      doc.setDrawColor(COLOR.rule).setLineWidth(0.2)
      doc.line(PAGE.margin, PAGE.height - 13, PAGE.width - PAGE.margin, PAGE.height - 13)
      doc.setFont(PRINT_FONT_FAMILY, "normal").setFontSize(7.5).setTextColor(COLOR.muted)
      doc.text(`${COMPANY_NAME} · ${encabezado.modulo} · S${encabezado.semana} ${encabezado.anio}`, PAGE.margin, PAGE.height - 9)
      doc.text(`Página ${pagina} de ${total}`, PAGE.width - PAGE.margin, PAGE.height - 9, { align: "right" })
    }
    return doc
  }

  return { doc, y: TOP, encabezado: dibujarEncabezado, finalizar }
}

function nuevaPagina(reporte: ReportePdf) {
  reporte.doc.addPage()
  reporte.encabezado()
  reporte.y = TOP
}

/** Salta de página si lo que sigue no cabe. */
export function asegurar(reporte: ReportePdf, alto: number) {
  if (reporte.y + alto > BOTTOM) nuevaPagina(reporte)
}

/** Título del documento (solo primera página). */
export function titulo(reporte: ReportePdf, texto: string, lineas: string[]) {
  const { doc } = reporte
  doc.setFont(PRINT_FONT_FAMILY, "bold").setFontSize(18).setTextColor(COLOR.ink)
  doc.text(texto, PAGE.margin, reporte.y + 6)
  reporte.y += 9
  doc.setFont(PRINT_FONT_FAMILY, "normal").setFontSize(9).setTextColor(COLOR.muted)
  for (const linea of lineas) {
    reporte.y += lineHeight(9)
    doc.text(linea, PAGE.margin, reporte.y)
  }
  reporte.y += 8
}

/** Encabezado de sección con una línea fina debajo. */
export function seccion(reporte: ReportePdf, texto: string) {
  asegurar(reporte, 20)
  const { doc } = reporte
  doc.setFont(PRINT_FONT_FAMILY, "bold").setFontSize(11).setTextColor(COLOR.ink)
  doc.text(texto, PAGE.margin, reporte.y + 4)
  reporte.y += 6.5
  doc.setDrawColor(COLOR.ink).setLineWidth(0.35)
  doc.line(PAGE.margin, reporte.y, PAGE.width - PAGE.margin, reporte.y)
  reporte.y += 5
}

/** Cifras clave en una fila, separadas por líneas finas. */
export function cifras(reporte: ReportePdf, items: { label: string; value: number | string; alerta?: boolean }[]) {
  asegurar(reporte, 20)
  const { doc } = reporte
  const ancho = CONTENT_WIDTH / items.length
  items.forEach((item, index) => {
    const x = PAGE.margin + ancho * index
    if (index > 0) {
      doc.setDrawColor(COLOR.rule).setLineWidth(0.2)
      doc.line(x, reporte.y, x, reporte.y + 14)
    }
    const padding = index > 0 ? 4 : 0
    doc.setFont(PRINT_FONT_FAMILY, "bold").setFontSize(20).setTextColor(item.alerta ? COLOR.alert : COLOR.ink)
    doc.text(String(item.value), x + padding, reporte.y + 7.5)
    doc.setFont(PRINT_FONT_FAMILY, "normal").setFontSize(8).setTextColor(COLOR.muted)
    doc.text(item.label, x + padding, reporte.y + 12.5)
  })
  reporte.y += 22
}

/** Tabla sobria: solo líneas horizontales, encabezado en gris, números alineados a la derecha. */
export function tabla(reporte: ReportePdf, columnas: { titulo: string; numerica?: boolean }[], filas: RowInput[]) {
  const columnStyles = Object.fromEntries(columnas.map((columna, index) => [index, columna.numerica ? { halign: "right" as const, cellWidth: 26 } : {}]))
  autoTable(reporte.doc, {
    startY: reporte.y,
    head: [columnas.map(columna => columna.titulo)],
    body: filas,
    theme: "plain",
    margin: { left: PAGE.margin, right: PAGE.margin, top: TOP, bottom: PAGE.height - BOTTOM },
    styles: { font: PRINT_FONT_FAMILY, fontSize: 8.5, textColor: COLOR.ink, cellPadding: { top: 1.8, bottom: 1.8, left: 0, right: 2 } },
    headStyles: { fontStyle: "bold", textColor: COLOR.muted, fontSize: 7.5 },
    columnStyles,
    didParseCell: data => {
      if (data.section === "head" && columnas[data.column.index]?.numerica) data.cell.styles.halign = "right"
    },
    didDrawCell: data => {
      reporte.doc.setDrawColor(COLOR.rule).setLineWidth(0.2)
      reporte.doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height)
    },
    willDrawPage: data => {
      // Las páginas que agrega la tabla llevan el mismo encabezado.
      if (data.pageNumber > 1) reporte.encabezado()
    },
  })
  reporte.y = (reporte.doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
}

/** Párrafo con ajuste de línea; salta de página entre líneas si hace falta. */
export function parrafo(reporte: ReportePdf, texto: string, opciones: { size?: number; color?: keyof typeof COLOR; bold?: boolean } = {}) {
  const { doc } = reporte
  const size = opciones.size ?? 9.5
  doc.setFont(PRINT_FONT_FAMILY, opciones.bold ? "bold" : "normal").setFontSize(size).setTextColor(COLOR[opciones.color ?? "ink"])
  const lineas: string[] = doc.splitTextToSize(texto, CONTENT_WIDTH)
  for (const linea of lineas) {
    asegurar(reporte, lineHeight(size))
    reporte.y += lineHeight(size)
    doc.text(linea, PAGE.margin, reporte.y - lineHeight(size) * 0.25)
  }
  reporte.y += 2
}

/** Alto del bloque de datos (etiqueta y valor en columnas), para no separarlo de su título. */
function altoDatos(doc: jsPDF, datos: { label: string; value: string }[], columnas: number) {
  const ancho = CONTENT_WIDTH / columnas - 4
  doc.setFont(PRINT_FONT_FAMILY, "normal").setFontSize(9)
  const filas = Math.ceil(datos.length / columnas)
  let alto = 0
  for (let fila = 0; fila < filas; fila++) {
    const lineas = Math.max(...datos.slice(fila * columnas, fila * columnas + columnas)
      .map(dato => (doc.splitTextToSize(dato.value, ancho) as string[]).length))
    alto += lineHeight(7.5) + lineas * lineHeight(9) + 2.5
  }
  return alto
}

/**
 * Título de un registro (hallazgo, accidente) con su marca a la derecha y sus datos en columnas.
 * Se mantiene junto en la misma página.
 */
export function encabezadoRegistro(
  reporte: ReportePdf,
  { titulo: texto, marca, marcaAlerta, datos, columnas = 4 }: {
    titulo: string
    marca: string
    marcaAlerta?: boolean
    datos: { label: string; value: string }[]
    columnas?: number
  },
) {
  const { doc } = reporte
  doc.setFont(PRINT_FONT_FAMILY, "bold").setFontSize(11.5)
  const lineasTitulo: string[] = doc.splitTextToSize(texto, CONTENT_WIDTH - 40)
  asegurar(reporte, lineasTitulo.length * lineHeight(11.5) + altoDatos(doc, datos, columnas) + 16)

  doc.setFont(PRINT_FONT_FAMILY, "bold").setFontSize(11.5).setTextColor(COLOR.ink)
  lineasTitulo.forEach((linea, index) => doc.text(linea, PAGE.margin, reporte.y + 4 + index * lineHeight(11.5)))
  doc.setFont(PRINT_FONT_FAMILY, "bold").setFontSize(8.5).setTextColor(marcaAlerta ? COLOR.alert : COLOR.ink)
  doc.text(marca, PAGE.width - PAGE.margin, reporte.y + 4, { align: "right" })
  reporte.y += 4 + (lineasTitulo.length - 1) * lineHeight(11.5) + 5

  const ancho = CONTENT_WIDTH / columnas
  for (let inicio = 0; inicio < datos.length; inicio += columnas) {
    const fila = datos.slice(inicio, inicio + columnas)
    let alto = 0
    fila.forEach((dato, index) => {
      const x = PAGE.margin + ancho * index
      doc.setFont(PRINT_FONT_FAMILY, "normal").setFontSize(7.5).setTextColor(COLOR.muted)
      doc.text(dato.label, x, reporte.y)
      doc.setFont(PRINT_FONT_FAMILY, "normal").setFontSize(9).setTextColor(COLOR.ink)
      const lineas: string[] = doc.splitTextToSize(dato.value, ancho - 4)
      lineas.forEach((linea, l) => doc.text(linea, x, reporte.y + lineHeight(7.5) + 0.8 + l * lineHeight(9)))
      alto = Math.max(alto, lineHeight(7.5) + lineas.length * lineHeight(9))
    })
    reporte.y += alto + 2.5
  }
  reporte.y += 1.5
}

/** Etiqueta pequeña antes de un grupo (p. ej. "Evidencia"). */
export function etiqueta(reporte: ReportePdf, texto: string) {
  asegurar(reporte, 12)
  reporte.doc.setFont(PRINT_FONT_FAMILY, "bold").setFontSize(8).setTextColor(COLOR.muted)
  reporte.doc.text(texto, PAGE.margin, reporte.y + 3)
  reporte.y += 5.5
}

const FOTO_PROPORCION = 4 / 3
const FOTO_COLUMNAS = 3
const FOTO_ESPACIO = 4

/** Fotos en rejilla de tres columnas, recortadas a 4:3 y comprimidas. */
export async function fotos(reporte: ReportePdf, urls: string[]) {
  const { doc } = reporte
  const ancho = (CONTENT_WIDTH - FOTO_ESPACIO * (FOTO_COLUMNAS - 1)) / FOTO_COLUMNAS
  const alto = ancho / FOTO_PROPORCION
  const imagenes = await Promise.all(urls.map(url => fotoParaPdf(url, FOTO_PROPORCION)))
  for (let inicio = 0; inicio < imagenes.length; inicio += FOTO_COLUMNAS) {
    asegurar(reporte, alto + FOTO_ESPACIO)
    imagenes.slice(inicio, inicio + FOTO_COLUMNAS).forEach((imagen, index) => {
      const x = PAGE.margin + (ancho + FOTO_ESPACIO) * index
      if (imagen) {
        doc.addImage(imagen, "JPEG", x, reporte.y, ancho, alto)
      } else {
        doc.setFillColor(COLOR.placeholder).rect(x, reporte.y, ancho, alto, "F")
        doc.setFont(PRINT_FONT_FAMILY, "normal").setFontSize(8).setTextColor(COLOR.muted)
        doc.text("Imagen no disponible", x + ancho / 2, reporte.y + alto / 2, { align: "center" })
      }
    })
    reporte.y += alto + FOTO_ESPACIO
  }
  reporte.y += 1
}

/** Línea fina entre registros. */
export function separador(reporte: ReportePdf) {
  reporte.y += 2
  if (reporte.y + 6 > BOTTOM) return
  reporte.doc.setDrawColor(COLOR.rule).setLineWidth(0.2)
  reporte.doc.line(PAGE.margin, reporte.y, PAGE.width - PAGE.margin, reporte.y)
  reporte.y += 7
}
