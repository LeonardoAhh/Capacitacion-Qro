import { pendingEvalStatus } from "@/lib/desempeno/pending-status"
import type { EmployeePending } from "@/lib/hooks/usePendingEvals"

/** Compartir pendientes de nuevo ingreso: filtros, conteos y textos para WhatsApp o correo. */

const MESES_ES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
] as const

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

export function etiquetaTurno(turno: string): string {
  return `Turno ${turno}`
}

// ─── Estado de cada pendiente ────────────────────────────────────────────────

/** Vencida con la misma regla de ventanas que el resto del sistema (campana y Desempeño). */
export function tieneVencida(employee: EmployeePending, topic: ShareTopic): boolean {
  if (topic === "evals") return employee.hasVencida
  return employee.rg_rec_048 === "Pendiente" && typeof employee.rg_dias_diff === "number" && employee.rg_dias_diff < 0
}

export function countVencidas(employees: EmployeePending[], topic: ShareTopic): number {
  if (topic === "rg") return employees.filter(employee => tieneVencida(employee, "rg")).length
  return employees.reduce((total, employee) => total + employee.evals
    .filter(evaluacion => pendingEvalStatus(evaluacion.diasDiff, evaluacion.numeroEvaluacion) === "vencidas").length, 0)
}

/** Empleados que tienen pendiente el tipo de documento elegido. */
export function aplicaAlTema(employee: EmployeePending, topic: ShareTopic): boolean {
  return topic === "evals" ? employee.evals.length > 0 : employee.rg_rec_048 === "Pendiente"
}

function dias(n: number) {
  return `${n} ${n === 1 ? "día" : "días"}`
}

/** "Vence en 3 días", "Vence hoy", "Vencida hace 2 días"; dentro de la tolerancia no se marca vencida. */
function estadoTexto(diasDiff: number, vencida: boolean): string {
  if (diasDiff > 0) return `Vence en ${dias(diasDiff)}`
  if (diasDiff === 0) return "Vence hoy"
  return vencida ? `Vencida hace ${dias(-diasDiff)}` : `Venció hace ${dias(-diasDiff)}, aún en plazo`
}

/** "OCTUBRE – NOVIEMBRE": mes anterior y mes de la fecha límite. */
function periodoTexto(fechaIso: string): string {
  const month = Number(fechaIso.split("-")[1])
  const prevMonth = month === 1 ? 12 : month - 1
  return `${MESES_ES[prevMonth - 1]} – ${MESES_ES[month - 1]}`
}

// ─── Mensajes ─────────────────────────────────────────────────────────────────

export interface BuildMessageOptions {
  employees: EmployeePending[]
  filterDept: string
  filterTurno: string
  template: TemplateType
  topic: ShareTopic
}

interface Linea {
  empleado: EmployeePending
  detalles: string[]
}

/** Estructura común a WhatsApp y correo: encabezado, grupos por departamento y cierre. */
function contenido({ employees, filterDept, filterTurno, template, topic }: BuildMessageOptions) {
  const plantilla = TEMPLATES[template]
  const filtros = [
    filterDept !== TODOS ? ["Departamento", filterDept] : null,
    filterTurno !== TODOS ? ["Turno", filterTurno] : null,
  ].filter((filtro): filtro is [string, string] => filtro !== null)

  const grupos = new Map<string, Linea[]>()
  for (const empleado of employees) {
    const detalles = topic === "evals"
      ? empleado.evals.map(evaluacion => `${evaluacion.periodo} (${periodoTexto(evaluacion.fecha)}): ${estadoTexto(
        evaluacion.diasDiff, pendingEvalStatus(evaluacion.diasDiff, evaluacion.numeroEvaluacion) === "vencidas")}`)
      : [`RG-REC-048: ${estadoTexto(empleado.rg_dias_diff ?? 0, tieneVencida(empleado, "rg"))}`]
    const departamento = empleado.departamento ?? "Sin departamento"
    grupos.set(departamento, [...(grupos.get(departamento) ?? []), { empleado, detalles }])
  }

  return {
    titulo: plantilla.title(TOPIC_TEXT[topic]),
    filtros,
    // Con un solo departamento filtrado, el encabezado de grupo sería redundante.
    mostrarDepartamento: filterDept === TODOS,
    grupos: [...grupos.entries()],
    cierre: plantilla.footer,
  }
}

function sinPendientes(topic: ShareTopic) {
  return `No hay ${TOPIC_TEXT[topic]} pendientes con los filtros seleccionados.`
}

/** Texto con el formato de WhatsApp (*negritas*, _cursivas_). */
export function buildWhatsAppMessage(options: BuildMessageOptions): string {
  if (!options.employees.length) return sinPendientes(options.topic)
  const { titulo, filtros, mostrarDepartamento, grupos, cierre } = contenido(options)
  const lines = [`*${titulo}*`, ""]
  for (const [nombre, valor] of filtros) lines.push(`*${nombre}:* ${valor}`)
  if (filtros.length) lines.push("")

  for (const [departamento, lineas] of grupos) {
    if (mostrarDepartamento) lines.push(`*${departamento}*`)
    for (const { empleado, detalles } of lineas) {
      lines.push(`*${empleado.nombre}*${empleado.numero ? ` (#${empleado.numero})` : ""}`)
      for (const detalle of detalles) lines.push(`  - ${detalle}`)
      lines.push("")
    }
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
  const { titulo, filtros, mostrarDepartamento, grupos, cierre } = contenido(options)
  const parts = [`<p><strong>${escapeHtml(titulo)}</strong></p>`]
  if (filtros.length) {
    parts.push(`<p>${filtros.map(([nombre, valor]) => `<strong>${nombre}:</strong> ${escapeHtml(valor)}`).join("<br>")}</p>`)
  }

  for (const [departamento, lineas] of grupos) {
    if (mostrarDepartamento) parts.push(`<h3>${escapeHtml(departamento)}</h3>`)
    parts.push("<ul>")
    for (const { empleado, detalles } of lineas) {
      const numero = empleado.numero ? ` #${escapeHtml(String(empleado.numero))}` : ""
      parts.push(`<li><strong>${escapeHtml(empleado.nombre)}</strong>${numero}<ul>${detalles
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
