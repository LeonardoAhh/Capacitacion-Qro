export const MAX_FINDING_TITLE_LENGTH = 40
export const MAX_FINDING_DESCRIPTION_LENGTH = 500
export const FINDING_PREVIEW_RATIO = 21 / 9
export const MAX_FINDING_IMAGES = 6

export const FINDING_DEADLINES = ["Corrección Inmediata", "1 semana", "15 días"] as const
export type FindingDeadline = (typeof FINDING_DEADLINES)[number]
