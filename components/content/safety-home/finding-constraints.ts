export const MAX_FINDING_TITLE_LENGTH = 40
// Debe coincidir con safety_findings_description_length (supabase/migrations).
export const MAX_FINDING_DESCRIPTION_LENGTH = 1000
export const FINDING_PREVIEW_RATIO = 21 / 9
/** Más baja que la tarjeta: en el panel de la lista la prioridad es la descripción. */
export const FINDING_DETAIL_IMAGE_RATIO = 3 / 1
export const MAX_FINDING_IMAGES = 6

export const FINDING_STATUSES = ["Abierto", "En seguimiento", "Cerrado"] as const
export type FindingStatus = (typeof FINDING_STATUSES)[number]

export const FINDING_DEADLINES = ["Corrección Inmediata", "1 semana", "15 días"] as const
export type FindingDeadline = (typeof FINDING_DEADLINES)[number]

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
