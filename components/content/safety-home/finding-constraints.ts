import { formatFechaCorta, hoyISO, sumarDias, textoAISO } from "@/lib/fechas"

export const MAX_FINDING_TITLE_LENGTH = 40
// Debe coincidir con safety_findings_description_length (supabase/migrations).
export const MAX_FINDING_DESCRIPTION_LENGTH = 1000
/** Foto del detalle, baja y ancha: en el panel la prioridad es la descripción. */
export const FINDING_DETAIL_IMAGE_RATIO = 3 / 1
export const MAX_FINDING_IMAGES = 6

export const FINDING_STATUSES = ["Abierto", "En seguimiento", "Cerrado"] as const
export type FindingStatus = (typeof FINDING_STATUSES)[number]

export const FINDING_DEADLINES = ["Corrección Inmediata", "1 semana", "15 días"] as const
export type FindingDeadline = (typeof FINDING_DEADLINES)[number]

/** Hallazgo como lo muestran la lista, el detalle y el PDF semanal. */
export interface FindingPreview {
  id: string
  week: number
  year: number
  title: string
  description: string
  area: string
  date: string
  status: FindingStatus
  deadline: FindingDeadline | null
  responsible?: string
  src: string
  evidences?: string[]
  alt: string
  evidencePaths: string[]
  completionEvidencePaths: string[]
  completionEvidences?: string[]
}

/**
 * La fecha de un hallazgo es el día en que se detectó en el recorrido (no su límite: ese sale del
 * plazo). Con "Fecha" a secas se capturaban fechas futuras.
 */
export const FINDING_DATE_LABEL = "Detectado el"

/** Detectado hoy o antes: un hallazgo no puede ser de un día que no ha llegado. */
export function isFindingDateValid(iso: string, today = hoyISO()): boolean {
  return Boolean(iso) && iso <= today
}

/** Días desde la fecha del hallazgo hasta su límite; "Corrección Inmediata" vence el mismo día. */
const DEADLINE_DAYS: Record<FindingDeadline, number> = {
  "Corrección Inmediata": 0,
  "1 semana": 7,
  "15 días": 15,
}

/** Fecha límite (AAAA-MM-DD) a partir de la fecha del hallazgo (DD/MM/AAAA) y su plazo. */
export function findingDueDate({ date, deadline }: { date: string; deadline: FindingDeadline | null }): string | null {
  const iso = textoAISO(date)
  return iso && deadline ? sumarDias(iso, DEADLINE_DAYS[deadline]) : null
}

/** Vencido: sigue sin cerrarse y hoy ya pasó su fecha límite. */
export function isFindingOverdue(
  finding: { date: string; deadline: FindingDeadline | null; status: FindingStatus },
  today = hoyISO(),
): boolean {
  const due = findingDueDate(finding)
  return finding.status !== "Cerrado" && due !== null && today > due
}

export const UNASSIGNED_LABEL = "Sin asignar"

export function isoWeek(isoDate: string): number {
  const date = new Date(`${isoDate}T12:00:00Z`)
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const first = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - first.getTime()) / 86400000) + 1) / 7)
}

export function sortWeekKeysDesc(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const [yearA, weekA] = a.split("-").map(Number)
    const [yearB, weekB] = b.split("-").map(Number)
    return yearB - yearA || weekB - weekA
  })
}

/** Opción del plazo con su vencimiento ("15 días · vence 13 dic") según la fecha capturada. */
export function deadlineOptionLabel(deadline: FindingDeadline, iso: string): string {
  return iso ? `${deadline} · vence ${formatFechaCorta(sumarDias(iso, DEADLINE_DAYS[deadline]))}` : deadline
}
