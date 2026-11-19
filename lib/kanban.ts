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
  /** Pedido de apoyo al equipo, con nota breve opcional. */
  necesita_apoyo: boolean
  apoyo_nota: string | null
  /** Si tiene texto, la tarjeta está bloqueada: "esperando a…". */
  bloqueo_motivo: string | null
  /** Personas que participan además del responsable. */
  colaboradores: string[]
  /** Autoría y fechas de cambio: las asigna la base de datos. */
  creado_por: string | null
  actualizado_por: string | null
  created_at: string
  updated_at: string
}

export type DatosTarjeta = Pick<KanbanTarjeta,
  "tipo" | "estado" | "prioridad" | "titulo" | "descripcion" | "fecha_inicio" | "fecha_limite" | "responsable_id" | "repeticion" | "colaboradores">

export interface KanbanPlantilla {
  id: string
  nombre: string
  tipo: KanbanTipo
  prioridad: KanbanPrioridad
  titulo: string
  descripcion: string
  repeticion: KanbanRepeticion
}

export type DatosPlantilla = Omit<KanbanPlantilla, "id">

export interface KanbanMiembro {
  user_id: string
  nombre: string
  /** Foto de perfil; sin foto se muestra la inicial. */
  avatar_url: string | null
}

export const KANBAN_COLUMNS_SELECT =
  "id,tipo,estado,prioridad,titulo,descripcion,fecha_inicio,fecha_limite,responsable_id,repeticion,concluido_at,necesita_apoyo,apoyo_nota,bloqueo_motivo,colaboradores,creado_por,actualizado_por,created_at,updated_at"

export const KANBAN_PLANTILLAS_SELECT = "id,nombre,tipo,prioridad,titulo,descripcion,repeticion"

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
/** Nota de apoyo y motivo de bloqueo. */
export const MAX_NOTA = 200
export const MAX_COLABORADORES = 10
/** Tarjetas en progreso por persona antes de sugerir cerrar algo. */
export const LIMITE_EN_PROGRESO = 3
/** Ventana de los indicadores del equipo. */
export const DIAS_INDICADORES = 30

export function etiquetaEstado(estado: KanbanEstado): string {
  return KANBAN_COLUMNAS.find(columna => columna.estado === estado)?.label ?? estado
}

export function etiquetaTipo(tipo: KanbanTipo): string {
  return KANBAN_TIPOS.find(item => item.tipo === tipo)?.label ?? tipo
}

export function etiquetaPrioridad(prioridad: KanbanPrioridad): string {
  return KANBAN_PRIORIDADES.find(item => item.prioridad === prioridad)?.label ?? prioridad
}

/** "Noemí Hernández Gudiño" → "N". */
export function inicial(nombre: string): string {
  return nombre.trim().charAt(0).toLocaleUpperCase("es-MX")
}

const FECHA_HORA = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" })

/** Marca de tiempo de la base de datos → "19 nov 2026, 14:30". */
export function formatFechaHora(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? "" : FECHA_HORA.format(date)
}

/** Fecha local de hoy en YYYY-MM-DD (sin desfase por zona horaria). */
export function hoyISO(): string {
  return aISO(new Date())
}

/** Date local → YYYY-MM-DD. */
function aISO(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-")
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
    // Sin duplicados ni el responsable entre los colaboradores (la base de datos aplica la misma regla).
    colaboradores: [...new Set(datos.colaboradores)]
      .filter(id => id !== datos.responsable_id).slice(0, MAX_COLABORADORES),
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

// ─── Equipo: participación, carga e indicadores ───────────────────────────────

/** Responsable o colaborador de la tarjeta. */
export function participa(tarjeta: Pick<KanbanTarjeta, "responsable_id" | "colaboradores">, userId: string): boolean {
  return tarjeta.responsable_id === userId || tarjeta.colaboradores.includes(userId)
}

export function enProgresoDe(tarjetas: KanbanTarjeta[], userId: string, excluirId?: string): number {
  return tarjetas.filter(tarjeta =>
    tarjeta.id !== excluirId && tarjeta.estado === "en_progreso" && tarjeta.responsable_id === userId).length
}

export interface CargaMiembro {
  miembro: KanbanMiembro
  activas: number
  enProgreso: number
  vencidas: number
  bloqueadas: number
}

/** Carga por persona: tarjetas no concluidas donde participa. Ordenado de mayor a menor carga. */
export function cargaDelEquipo(tarjetas: KanbanTarjeta[], miembros: KanbanMiembro[], hoy = hoyISO()): CargaMiembro[] {
  const abiertas = tarjetas.filter(tarjeta => tarjeta.estado !== "concluido")
  return miembros.map(miembro => {
    const suyas = abiertas.filter(tarjeta => participa(tarjeta, miembro.user_id))
    return {
      miembro,
      activas: suyas.length,
      enProgreso: enProgresoDe(abiertas, miembro.user_id),
      vencidas: suyas.filter(tarjeta => estaVencida(tarjeta, hoy)).length,
      bloqueadas: suyas.filter(tarjeta => tarjeta.bloqueo_motivo).length,
    }
  }).sort((left, right) => right.activas - left.activas || left.miembro.nombre.localeCompare(right.miembro.nombre, "es"))
}

export interface IndicadoresEquipo {
  concluidas: number
  /** Con fecha límite: concluidas ese día o antes. */
  aTiempo: number
  conFecha: number
  /** Días promedio de la creación a la conclusión; null sin datos. */
  diasPromedio: number | null
}

/** Indicadores de las tarjetas concluidas en los últimos DIAS_INDICADORES días. */
export function indicadoresEquipo(tarjetas: KanbanTarjeta[], ahora = Date.now()): IndicadoresEquipo {
  const desde = ahora - DIAS_INDICADORES * 86_400_000
  const concluidas = tarjetas.filter(tarjeta =>
    tarjeta.estado === "concluido" && tarjeta.concluido_at && new Date(tarjeta.concluido_at).getTime() >= desde)
  const conFecha = concluidas.filter(tarjeta => tarjeta.fecha_limite)
  const aTiempo = conFecha.filter(tarjeta => fechaLocal(tarjeta.concluido_at as string) <= (tarjeta.fecha_limite as string))
  const duraciones = concluidas.map(tarjeta =>
    (new Date(tarjeta.concluido_at as string).getTime() - new Date(tarjeta.created_at).getTime()) / 86_400_000)
  return {
    concluidas: concluidas.length,
    aTiempo: aTiempo.length,
    conFecha: conFecha.length,
    diasPromedio: duraciones.length ? duraciones.reduce((sum, value) => sum + value, 0) / duraciones.length : null,
  }
}

// ─── Fechas de calendario ─────────────────────────────────────────────────────

/** Marca de tiempo → fecha local YYYY-MM-DD. */
export function fechaLocal(iso: string): string {
  return aISO(new Date(iso))
}

export function sumarDias(iso: string, dias: number): string {
  const [year, month, day] = iso.split("-").map(Number)
  return aISO(new Date(year, month - 1, day + dias))
}

/** Lunes de la semana que contiene la fecha. */
export function inicioSemana(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number)
  const diaSemana = (new Date(year, month - 1, day).getDay() + 6) % 7
  return sumarDias(iso, -diaSemana)
}

const DIA_SEMANA = new Intl.DateTimeFormat("es-MX", { weekday: "short" })

/** "2026-11-19" → "jue". */
export function formatDiaSemana(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number)
  return DIA_SEMANA.format(new Date(year, month - 1, day)).replace(".", "")
}

// ─── Notas (apoyo / bloqueo) y plantillas ────────────────────────────────────

/** Nota breve ya normalizada; vacía = null. */
export function normalizarNota(texto: string): string | null {
  const limpio = normalizarTexto(texto)
  return limpio ? limpio.slice(0, MAX_NOTA) : null
}

export function plantillaDesdeTarjeta(tarjeta: KanbanTarjeta, nombre: string): DatosPlantilla {
  const { tipo, prioridad, titulo, descripcion, repeticion } = tarjeta
  return { nombre: normalizarTexto(nombre), tipo, prioridad, titulo, descripcion, repeticion }
}

// ─── Checklist, comentarios y avisos ─────────────────────────────────────────

export interface KanbanPaso {
  id: string
  tarjeta_id: string
  texto: string
  hecho: boolean
  created_at: string
}

export interface KanbanComentario {
  id: string
  tarjeta_id: string
  autor_id: string | null
  texto: string
  created_at: string
}

export type KanbanAvisoTipo = "asignada" | "colaborador" | "apoyo_tomado" | "comentario"

export interface KanbanAviso {
  id: string
  tarjeta_id: string | null
  tipo: KanbanAvisoTipo
  titulo: string
  actor_nombre: string | null
  leido: boolean
  created_at: string
}

export const KANBAN_PASOS_SELECT = "id,tarjeta_id,texto,hecho,created_at"
export const KANBAN_COMENTARIOS_SELECT = "id,tarjeta_id,autor_id,texto,created_at"
export const KANBAN_AVISOS_SELECT = "id,tarjeta_id,tipo,titulo,actor_nombre,leido,created_at"
/** Igual que la base de datos. */
export const MAX_PASOS = 30
export const MAX_PASO = 200
export const MAX_COMENTARIO = 1000
/** Avisos recientes que se muestran en la campana. */
export const LIMITE_AVISOS = 30

const ACCION_AVISO: Record<KanbanAvisoTipo, string> = {
  asignada: "te asignó",
  colaborador: "te sumó como colaborador en",
  apoyo_tomado: "tomó tu pedido de apoyo en",
  comentario: "comentó en",
}

/** "ANA LÓPEZ te asignó" (sin el título, que se muestra aparte). */
export function textoAviso(aviso: Pick<KanbanAviso, "tipo" | "actor_nombre">): string {
  return `${aviso.actor_nombre ?? "Alguien"} ${ACCION_AVISO[aviso.tipo]}`
}

const TIEMPO_RELATIVO = new Intl.RelativeTimeFormat("es-MX", { numeric: "auto" })

/** "hace 5 minutos", "ayer". */
export function formatHace(iso: string, ahora = Date.now()): string {
  const minutos = Math.round((new Date(iso).getTime() - ahora) / 60_000)
  if (Math.abs(minutos) < 60) return TIEMPO_RELATIVO.format(minutos, "minute")
  const horas = Math.round(minutos / 60)
  if (Math.abs(horas) < 24) return TIEMPO_RELATIVO.format(horas, "hour")
  return TIEMPO_RELATIVO.format(Math.round(horas / 24), "day")
}

/** Mis tarjetas abiertas que vencen hoy o mañana (las vencidas ya se marcan en el tablero). */
export function porVencer<T extends Pick<KanbanTarjeta, "estado" | "fecha_limite" | "responsable_id" | "colaboradores">>(
  tarjetas: T[], userId: string, hoy = hoyISO(),
): T[] {
  const manana = sumarDias(hoy, 1)
  return tarjetas.filter(tarjeta => tarjeta.estado !== "concluido" && participa(tarjeta, userId)
    && tarjeta.fecha_limite !== null && tarjeta.fecha_limite >= hoy && tarjeta.fecha_limite <= manana)
}

// ─── Crear tarjetas desde otros módulos ──────────────────────────────────────

export type TarjetaDesde = Pick<DatosTarjeta, "titulo" | "descripcion" | "fecha_inicio" | "fecha_limite">

const PARAM_NUEVA = "nueva"
export const PARAM_TARJETA = "tarjeta"

/** Primer y último día del mes (mes 1–12). */
export function rangoDelMes(anio: number, mes: number): Pick<TarjetaDesde, "fecha_inicio" | "fecha_limite"> {
  const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`
  return { fecha_inicio: inicio, fecha_limite: sumarDias(`${anio}-${String(mes + 1).padStart(2, "0")}-01`, -1) }
}

/** Enlace al tablero que abre "Nueva tarjeta" con estos datos. */
export function enlaceNuevaTarjeta(datos: TarjetaDesde): string {
  const params = new URLSearchParams({ [PARAM_NUEVA]: "1", titulo: datos.titulo, descripcion: datos.descripcion })
  if (datos.fecha_inicio) params.set("inicio", datos.fecha_inicio)
  if (datos.fecha_limite) params.set("limite", datos.fecha_limite)
  return `/kanban?${params.toString()}`
}

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/

/** Lee los datos de enlaceNuevaTarjeta; null si el enlace no pide una tarjeta nueva. */
export function leerNuevaTarjeta(params: URLSearchParams): TarjetaDesde | null {
  if (params.get(PARAM_NUEVA) !== "1") return null
  const fecha = (key: string) => {
    const value = params.get(key)
    return value && FECHA_ISO.test(value) ? value : null
  }
  return {
    titulo: normalizarTexto(params.get("titulo") ?? "").slice(0, MAX_TITULO),
    descripcion: normalizarTexto(params.get("descripcion") ?? "", true).slice(0, MAX_DESCRIPCION),
    fecha_inicio: fecha("inicio"),
    fecha_limite: fecha("limite"),
  }
}
