/**
 * Tablero Kanban compartido (tabla public.kanban_tarjetas): tipos, columnas,
 * prioridades y utilidades de fecha.
 */

export type KanbanEstado = "por_hacer" | "pendiente" | "en_progreso" | "concluido"
export type KanbanTipo = "actividad" | "recordatorio"
export type KanbanPrioridad = "alta" | "media" | "baja"
export type KanbanRepeticion = "ninguna" | "semanal" | "mensual"

export interface KanbanTarjeta {
  id: string
  tipo: KanbanTipo
  estado: KanbanEstado
  prioridad: KanbanPrioridad
  titulo: string
  descripcion: string
  /** Fechas en formato YYYY-MM-DD; ambas opcionales. */
  fecha_inicio: string | null
  fecha_limite: string | null
  responsable_id: string | null
  /** Solo recordatorios con fecha límite; al concluir se crea el siguiente. */
  repeticion: KanbanRepeticion
  /** Cuándo pasó a Concluido; null si no está concluida. Lo asigna la base de datos. */
  concluido_at: string | null
  /** Autoría y fechas de cambio: las asigna la base de datos. */
  creado_por: string | null
  actualizado_por: string | null
  created_at: string
  updated_at: string
}

export type DatosTarjeta = Pick<KanbanTarjeta,
  "tipo" | "estado" | "prioridad" | "titulo" | "descripcion" | "fecha_inicio" | "fecha_limite" | "responsable_id" | "repeticion">

export interface KanbanMiembro {
  user_id: string
  nombre: string
}

export const KANBAN_COLUMNS_SELECT =
  "id,tipo,estado,prioridad,titulo,descripcion,fecha_inicio,fecha_limite,responsable_id,repeticion,concluido_at,creado_por,actualizado_por,created_at,updated_at"

export const KANBAN_COLUMNAS: { estado: KanbanEstado; label: string }[] = [
  { estado: "por_hacer", label: "Por hacer" },
  { estado: "pendiente", label: "Pendiente" },
  { estado: "en_progreso", label: "En progreso" },
  { estado: "concluido", label: "Concluido" },
]

export const KANBAN_TIPOS: { tipo: KanbanTipo; label: string; plural: string }[] = [
  { tipo: "actividad", label: "Actividad", plural: "Actividades" },
  { tipo: "recordatorio", label: "Recordatorio", plural: "Recordatorios" },
]

/** Orden de lista: de mayor a menor prioridad. */
export const KANBAN_PRIORIDADES: { prioridad: KanbanPrioridad; label: string }[] = [
  { prioridad: "alta", label: "Alta" },
  { prioridad: "media", label: "Media" },
  { prioridad: "baja", label: "Baja" },
]

export const KANBAN_REPETICIONES: { repeticion: KanbanRepeticion; label: string }[] = [
  { repeticion: "ninguna", label: "No se repite" },
  { repeticion: "semanal", label: "Cada semana" },
  { repeticion: "mensual", label: "Cada mes" },
]

/** Las concluidas hace más de estos días se ocultan hasta pedir "Ver anteriores". */
export const DIAS_CONCLUIDAS_VISIBLES = 30

export function esConcluidaAntigua(tarjeta: Pick<KanbanTarjeta, "estado" | "concluido_at">, ahora = Date.now()): boolean {
  if (tarjeta.estado !== "concluido" || !tarjeta.concluido_at) return false
  return ahora - new Date(tarjeta.concluido_at).getTime() > DIAS_CONCLUIDAS_VISIBLES * 86_400_000
}

export const MAX_TITULO = 120
export const MAX_DESCRIPCION = 1000

export function etiquetaEstado(estado: KanbanEstado): string {
  return KANBAN_COLUMNAS.find(columna => columna.estado === estado)?.label ?? estado
}

export function etiquetaTipo(tipo: KanbanTipo): string {
  return KANBAN_TIPOS.find(item => item.tipo === tipo)?.label ?? tipo
}

export function etiquetaPrioridad(prioridad: KanbanPrioridad): string {
  return KANBAN_PRIORIDADES.find(item => item.prioridad === prioridad)?.label ?? prioridad
}

/** "Noemí Hernández Gudiño" → "NH". */
export function iniciales(nombre: string): string {
  return nombre.trim().split(/\s+/).slice(0, 2).map(parte => parte.charAt(0).toLocaleUpperCase("es-MX")).join("")
}

const FECHA_HORA = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" })

/** Marca de tiempo de la base de datos → "19 nov 2026, 14:30". */
export function formatFechaHora(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? "" : FECHA_HORA.format(date)
}

/** Fecha local de hoy en YYYY-MM-DD (sin desfase por zona horaria). */
export function hoyISO(): string {
  const now = new Date()
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-")
}

const FECHA_CORTA = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" })

/** "2026-11-18" → "18 nov". */
export function formatFechaCorta(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number)
  return FECHA_CORTA.format(new Date(year, month - 1, day)).replace(".", "")
}

/** Rango legible: "18 nov – 22 nov", "Desde 18 nov", "Vence 22 nov". */
export function formatRango(inicio: string | null, limite: string | null): string | null {
  if (inicio && limite) return inicio === limite ? formatFechaCorta(limite) : `${formatFechaCorta(inicio)} – ${formatFechaCorta(limite)}`
  if (limite) return `Vence ${formatFechaCorta(limite)}`
  if (inicio) return `Desde ${formatFechaCorta(inicio)}`
  return null
}

/** Vencida solo si tiene fecha límite pasada y no está concluida. */
export function estaVencida(tarjeta: Pick<KanbanTarjeta, "estado" | "fecha_limite">, hoy = hoyISO()): boolean {
  return tarjeta.estado !== "concluido" && tarjeta.fecha_limite !== null && tarjeta.fecha_limite < hoy
}

const ORDEN_PRIORIDAD: Record<KanbanPrioridad, number> = { alta: 0, media: 1, baja: 2 }

/** Primero las que vencen antes (sin fecha al final), luego por prioridad y por creación. */
export function ordenarTarjetas(tarjetas: KanbanTarjeta[]): KanbanTarjeta[] {
  return [...tarjetas].sort((left, right) => {
    if (left.fecha_limite !== right.fecha_limite) {
      if (!left.fecha_limite) return 1
      if (!right.fecha_limite) return -1
      return left.fecha_limite.localeCompare(right.fecha_limite)
    }
    return ORDEN_PRIORIDAD[left.prioridad] - ORDEN_PRIORIDAD[right.prioridad]
      || left.created_at.localeCompare(right.created_at)
  })
}

// Caracteres que no se guardan: control e invisibles (salvo salto de línea),
// emojis y símbolos decorativos, y marcas sueltas que quedan tras normalizar.
const CARACTERES_NO_PERMITIDOS = /[\p{Cc}\p{Cf}\p{Co}\p{Cn}\p{So}\p{Sk}\p{M}]/gu

function quitarNoPermitidos(texto: string): string {
  return texto.normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\u00A0]/g, " ")
    .replace(CARACTERES_NO_PERMITIDOS, caracter => caracter === "\n" ? caracter : "")
}

/**
 * Limpieza mientras se escribe: mayúsculas, sin caracteres raros y sin
 * espacios repetidos. No recorta extremos para no estorbar al escribir.
 */
export function limpiarAlEscribir(texto: string, multilinea = false): string {
  const base = quitarNoPermitidos(texto).toLocaleUpperCase("es-MX")
  return (multilinea ? base : base.replace(/\n/g, " ")).replace(/[^\S\n]{2,}/g, " ")
}

/**
 * Forma final que se guarda: además recorta extremos, quita espacios al inicio
 * y fin de cada línea y deja como máximo una línea en blanco seguida.
 */
export function normalizarTexto(texto: string, multilinea = false): string {
  const limpio = limpiarAlEscribir(texto, multilinea)
  if (!multilinea) return limpio.trim()
  return limpio.split("\n").map(linea => linea.trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

/** Datos listos para guardar: textos normalizados. */
export function normalizarTarjeta(datos: DatosTarjeta): DatosTarjeta {
  return {
    ...datos,
    titulo: normalizarTexto(datos.titulo),
    descripcion: normalizarTexto(datos.descripcion, true),
    // Las actividades no se repiten.
    repeticion: datos.tipo === "recordatorio" ? datos.repeticion : "ninguna",
  }
}

/** Paso 1 (contenido): título y descripción ya normalizados. */
export function validarContenido(datos: Pick<DatosTarjeta, "titulo" | "descripcion">): string | null {
  if (!datos.titulo) return "Escribe un título."
  if (!/[\p{L}\p{N}]/u.test(datos.titulo)) return "El título debe tener al menos una letra o un número."
  if (datos.titulo.length > MAX_TITULO) return `El título admite hasta ${MAX_TITULO} caracteres.`
  if (datos.descripcion.length > MAX_DESCRIPCION) return `La descripción admite hasta ${MAX_DESCRIPCION} caracteres.`
  return null
}

/** Paso 2 (seguimiento): coherencia de fechas y repetición. */
export function validarSeguimiento(datos: Pick<DatosTarjeta, "fecha_inicio" | "fecha_limite" | "repeticion">): string | null {
  if (datos.fecha_inicio && datos.fecha_limite && datos.fecha_limite < datos.fecha_inicio) {
    return "La fecha límite no puede ser anterior a la de inicio."
  }
  if (datos.repeticion !== "ninguna" && !datos.fecha_limite) {
    return "Para repetir el recordatorio, indica la fecha límite."
  }
  return null
}

/** Mensaje de error o null si la tarjeta completa (ya normalizada) es válida. */
export function validarTarjeta(datos: DatosTarjeta): string | null {
  return validarContenido(datos) ?? validarSeguimiento(datos)
}
