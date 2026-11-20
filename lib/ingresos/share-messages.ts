import { pendingEvalStatus } from "@/lib/desempeno/pending-status"
import type { EmployeePending, PendingEvalEntry } from "@/lib/hooks/usePendingEvals"

/** Compartir pendientes de nuevo ingreso: filtros, conteos y textos para WhatsApp o correo. */

export const COPY_RESET_DELAY_MS = 2_000
/** Límite práctico de un mensaje prellenado en wa.me. */
export const WA_CHAR_LIMIT = 65_000
export const SEARCH_MAX_LENGTH = 80
export const TODOS = "all"

export type ShareTopic = "evals" | "rg"
export type ShareFormat = "whatsapp" | "email"
export type TemplateType = "formal" | "informal" | "urgent"

export const TOPIC_OPTIONS: { value: ShareTopic; label: string }[] = [
  { value: "evals", label: "Evaluaciones" },
  { value: "rg", label: "RG-REC-048" },
]

export const FORMAT_OPTIONS: { value: ShareFormat; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Correo" },
]

export const TEMPLATE_OPTIONS: { value: TemplateType; label: string }[] = [
  { value: "formal", label: "Formal" },
  { value: "informal", label: "Informal" },
  { value: "urgent", label: "Urgente" },
]

/** Cómo se nombra cada tipo de documento dentro del mensaje. */
const TOPIC_TEXT: Record<ShareTopic, string> = {
  evals: "evaluaciones",
  rg: "documentos RG-REC-048",
}

const TEMPLATES: Record<TemplateType, { title: (tema: string) => string; footer: string }> = {
  formal: {
    title: tema => `Recordatorio de ${tema} pendientes`,
    footer: "Favor de atender a la brevedad.",
  },
  informal: {
    title: tema => `Hola equipo, tenemos ${tema} pendientes`,
    footer: "Gracias por su apoyo.",
  },
  urgent: {
    title: tema => `URGENTE: ${tema} por atender`,
    footer: "Por favor atender hoy sin falta.",
  },
}

const FIRMA = "Capacitación"

/** Flujo de Desempeño: una evaluación vencida ya no se resuelve por cuenta del jefe. */
const NOTA_VENCIDAS = "Para las evaluaciones vencidas, acudir a Recursos Humanos con el departamento de capacitación."

export function etiquetaTurno(turno: string): string {
  return `Turno ${turno}`
}

// ─── Estado de cada pendiente ────────────────────────────────────────────────

/** Vencida con la misma regla de ventanas que el resto del sistema (campana y Desempeño). */
export function tieneVencida(employee: EmployeePending, topic: ShareTopic): boolean {
  if (topic === "evals") return employee.hasVencida
  return employee.rg_rec_048 === "Pendiente" && typeof employee.rg_dias_diff === "number" && employee.rg_dias_diff < 0
}

function esVencida(evaluacion: PendingEvalEntry) {
  return pendingEvalStatus(evaluacion.diasDiff, evaluacion.numeroEvaluacion) === "vencidas"
}

/**
 * Evaluaciones que piden acción (vencidas o próximas), de la que vence antes a la
 * última. Con `incluirTodas` también las que aún van a tiempo.
 */
export function evaluacionesAMostrar(employee: EmployeePending, incluirTodas: boolean): PendingEvalEntry[] {
  return employee.evals
    .filter(evaluacion => incluirTodas || pendingEvalStatus(evaluacion.diasDiff, evaluacion.numeroEvaluacion) !== "a-tiempo")
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

/** Empleados con algo que mostrar para el documento elegido. */
export function aplicaAlTema(employee: EmployeePending, topic: ShareTopic, incluirTodas: boolean): boolean {
  return topic === "evals" ? evaluacionesAMostrar(employee, incluirTodas).length > 0 : employee.rg_rec_048 === "Pendiente"
}

export function countVencidas(employees: EmployeePending[], topic: ShareTopic): number {
  if (topic === "rg") return employees.filter(employee => tieneVencida(employee, "rg")).length
  return employees.reduce((total, employee) => total + employee.evals.filter(esVencida).length, 0)
}

const FECHA_CORTA = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" })

/** "2026-11-22" → "22 nov". */
function fechaCorta(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number)
  return FECHA_CORTA.format(new Date(Date.UTC(year, month - 1, day))).replace(".", "")
}

/** "vence 22 nov", "vence hoy", "venció el 17 nov"; dentro de la tolerancia, "aún en plazo". */
function estadoTexto(fecha: string, diasDiff: number, vencida: boolean): string {
  if (diasDiff === 0) return "vence hoy"
  if (diasDiff > 0) return `vence ${fechaCorta(fecha)}`
  return vencida ? `venció el ${fechaCorta(fecha)}` : `venció el ${fechaCorta(fecha)}, aún en plazo`
}

function plural(n: number, singular: string, varios: string) {
  return `${n} ${n === 1 ? singular : varios}`
}

// ─── Mensajes ─────────────────────────────────────────────────────────────────

export interface BuildMessageOptions {
  employees: EmployeePending[]
  filterDept: string
  filterTurno: string
  template: TemplateType
  topic: ShareTopic
  /** Abre el mensaje con una sección de vencidas; el resto sigue por departamento. */
  priorizar: boolean
  /** Incluye también las evaluaciones que aún van a tiempo. */
  incluirTodas: boolean
}

interface Linea {
  empleado: EmployeePending
  detalles: string[]
  /** En la sección de vencidas se indica el departamento de cada persona. */
  departamento?: string
}

const SECCION_VENCIDAS = "VENCIDAS"

/** "2 vencidas · 14 próximas" (evaluaciones) o "10 pendientes · 3 vencidos" (RG-REC-048). */
function resumen(employees: EmployeePending[], topic: ShareTopic, incluirTodas: boolean): string {
  if (topic === "rg") {
    const vencidos = countVencidas(employees, "rg")
    return [plural(employees.length, "pendiente", "pendientes"), vencidos && plural(vencidos, "vencido", "vencidos")]
      .filter(Boolean).join(" · ")
  }
  const mostradas = employees.flatMap(employee => evaluacionesAMostrar(employee, incluirTodas))
  const estados = mostradas.map(evaluacion => pendingEvalStatus(evaluacion.diasDiff, evaluacion.numeroEvaluacion))
  const vencidas = estados.filter(estado => estado === "vencidas").length
  const proximas = estados.filter(estado => estado === "proximas").length
  const aTiempo = estados.length - vencidas - proximas
  return [
    vencidas && plural(vencidas, "vencida", "vencidas"),
    proximas && plural(proximas, "próxima", "próximas"),
    aTiempo && plural(aTiempo, "a tiempo", "a tiempo"),
  ].filter(Boolean).join(" · ")
}

/** Estructura común a WhatsApp y correo: encabezado, resumen, grupos y cierre. */
function contenido({ employees, filterDept, filterTurno, template, topic, priorizar, incluirTodas }: BuildMessageOptions) {
  const plantilla = TEMPLATES[template]
  const filtros = [
    filterDept !== TODOS ? ["Departamento", filterDept] : null,
    filterTurno !== TODOS ? ["Turno", filterTurno] : null,
  ].filter((filtro): filtro is [string, string] => filtro !== null)

  const mostrarDepartamento = filterDept === TODOS
  const grupos = new Map<string, Linea[]>()
  const agregar = (grupo: string, linea: Linea) => grupos.set(grupo, [...(grupos.get(grupo) ?? []), linea])
  // Con prioridad, la sección de vencidas va primero (el Map conserva el orden de inserción).
  if (priorizar) grupos.set(SECCION_VENCIDAS, [])

  for (const empleado of employees) {
    const detalles = topic === "evals"
      ? evaluacionesAMostrar(empleado, incluirTodas).map(evaluacion =>
        `${evaluacion.periodo.toLocaleLowerCase("es-MX")} · ${estadoTexto(evaluacion.fecha, evaluacion.diasDiff, esVencida(evaluacion))}`)
      : [`RG-REC-048 · ${empleado.fecha_vencimiento_rg
        ? estadoTexto(empleado.fecha_vencimiento_rg, empleado.rg_dias_diff ?? 0, tieneVencida(empleado, "rg"))
        : "sin fecha"}`]
    if (!detalles.length) continue
    const departamento = empleado.departamento ?? "Sin departamento"
    if (priorizar && tieneVencida(empleado, topic)) {
      agregar(SECCION_VENCIDAS, { empleado, detalles, departamento: mostrarDepartamento ? departamento : undefined })
    } else {
      agregar(departamento, { empleado, detalles })
    }
  }

  return {
    titulo: plantilla.title(TOPIC_TEXT[topic]),
    resumen: resumen(employees, topic, incluirTodas),
    nota: topic === "evals" && countVencidas(employees, "evals") > 0 ? NOTA_VENCIDAS : null,
    filtros,
    // La sección de vencidas siempre lleva encabezado; los departamentos, solo si no hay uno filtrado.
    mostrarEncabezado: (grupo: string) => grupo === SECCION_VENCIDAS || mostrarDepartamento,
    grupos: [...grupos.entries()].filter(([, lineas]) => lineas.length > 0),
    cierre: plantilla.footer,
  }
}

function sinPendientes(topic: ShareTopic) {
  return `No hay ${TOPIC_TEXT[topic]} por atender con los filtros seleccionados.`
}

/** Texto con el formato de WhatsApp (*negritas*, _cursivas_). */
export function buildWhatsAppMessage(options: BuildMessageOptions): string {
  if (!options.employees.length) return sinPendientes(options.topic)
  const { titulo, resumen, nota, filtros, mostrarEncabezado, grupos, cierre } = contenido(options)
  const lines = [`*${titulo}*`, resumen, ""]
  if (nota) lines.push(`_${nota}_`, "")
  for (const [nombre, valor] of filtros) lines.push(`*${nombre}:* ${valor}`)
  if (filtros.length) lines.push("")

  for (const [departamento, lineas] of grupos) {
    if (mostrarEncabezado(departamento)) lines.push(`*${departamento}*`)
    for (const { empleado, detalles, departamento: area } of lineas) {
      lines.push(`${empleado.nombre}${empleado.numero ? ` (#${empleado.numero})` : ""}${area ? ` · ${area}` : ""}`)
      for (const detalle of detalles) lines.push(`  - ${detalle}`)
    }
    lines.push("")
  }

  lines.push(`_${cierre}_`, `_${FIRMA}_`)
  return lines.join("\n")
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character)
}

/**
 * HTML semántico sin estilos en línea: el cliente de correo aplica los suyos y
 * la vista previa los da con clases. Todo texto de la base de datos se escapa.
 */
export function buildEmailMessage(options: BuildMessageOptions): string {
  if (!options.employees.length) return `<p>${sinPendientes(options.topic)}</p>`
  const { titulo, resumen, nota, filtros, mostrarEncabezado, grupos, cierre } = contenido(options)
  const parts = [`<p><strong>${escapeHtml(titulo)}</strong><br>${escapeHtml(resumen)}</p>`]
  if (nota) parts.push(`<p><em>${escapeHtml(nota)}</em></p>`)
  if (filtros.length) {
    parts.push(`<p>${filtros.map(([nombre, valor]) => `<strong>${nombre}:</strong> ${escapeHtml(valor)}`).join("<br>")}</p>`)
  }

  for (const [departamento, lineas] of grupos) {
    if (mostrarEncabezado(departamento)) parts.push(`<h3>${escapeHtml(departamento)}</h3>`)
    parts.push("<ul>")
    for (const { empleado, detalles, departamento: area } of lineas) {
      const numero = empleado.numero ? ` #${escapeHtml(String(empleado.numero))}` : ""
      const extra = area ? ` · ${escapeHtml(area)}` : ""
      parts.push(`<li>${escapeHtml(empleado.nombre)}${numero}${extra}<ul>${detalles
        .map(detalle => `<li>${escapeHtml(detalle)}</li>`).join("")}</ul></li>`)
    }
    parts.push("</ul>")
  }

  parts.push(`<p><em>${escapeHtml(cierre)}</em><br><em>${FIRMA}</em></p>`)
  return parts.join("")
}

/** Texto plano del HTML, para clientes que no aceptan HTML al pegar. */
export function htmlATexto(html: string): string {
  const documento = new DOMParser().parseFromString(html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|li|h3)>/gi, "$&\n"), "text/html")
  return (documento.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim()
}

export function downloadAsTxt(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** "evaluaciones-pendientes-2026-11-20.txt" o "rg-rec-048-pendientes-…". */
export function nombreArchivo(topic: ShareTopic): string {
  const base = topic === "evals" ? "evaluaciones" : "rg-rec-048"
  return `${base}-pendientes-${new Date().toISOString().slice(0, 10)}.txt`
}
