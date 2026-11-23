export const MAX_FINDING_TITLE_LENGTH = 40
// Debe coincidir con safety_findings_description_length (supabase/migrations).
export const MAX_FINDING_DESCRIPTION_LENGTH = 1000
export const FINDING_PREVIEW_RATIO = 21 / 9
/** Más baja que la tarjeta: en el panel de la lista la prioridad es la descripción. */
export const FINDING_DETAIL_IMAGE_RATIO = 3 / 1
export const MAX_FINDING_IMAGES = 6

export const FINDING_DEADLINES = ["Corrección Inmediata", "1 semana", "15 días"] as const
export type FindingDeadline = (typeof FINDING_DEADLINES)[number]
