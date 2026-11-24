import type { DesempenoData } from "@/lib/types/desempeno"

/**
 * Lo que se guarda en este navegador para no perder trabajo: el borrador de una
 * evaluación a medio capturar y el último evaluador usado por la cuenta. Solo
 * conveniencias locales; la evaluación oficial se guarda en la base de datos.
 */
const DRAFT_PREFIX = "desempeno:borrador"
const EVALUATOR_PREFIX = "desempeno:evaluador"
/** Un borrador más viejo ya no corresponde a una captura en curso. */
const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export interface EvaluationDraft {
  data: DesempenoData
  savedAt: number
}

const draftKey = (userId: string, identity: string) => `${DRAFT_PREFIX}:${userId}:${identity}`
const evaluatorKey = (userId: string) => `${EVALUATOR_PREFIX}:${userId}`

function read(key: string): string | null {
  try { return window.localStorage.getItem(key) } catch { return null }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // Almacenamiento no disponible (modo privado, cuota): se sigue sin borrador.
  }
}

export function readDraft(userId: string, identity: string): EvaluationDraft | null {
  const raw = read(draftKey(userId, identity))
  if (!raw) return null
  try {
    const draft = JSON.parse(raw) as EvaluationDraft
    if (!draft?.data || typeof draft.savedAt !== "number" || Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) {
      write(draftKey(userId, identity), null)
      return null
    }
    return draft
  } catch {
    write(draftKey(userId, identity), null)
    return null
  }
}

export function writeDraft(userId: string, identity: string, data: DesempenoData) {
  write(draftKey(userId, identity), JSON.stringify({ data, savedAt: Date.now() } satisfies EvaluationDraft))
}

export function clearDraft(userId: string, identity: string) {
  write(draftKey(userId, identity), null)
}

export const readLastEvaluator = (userId: string) => read(evaluatorKey(userId))
export const writeLastEvaluator = (userId: string, nombre: string) => write(evaluatorKey(userId), nombre)
