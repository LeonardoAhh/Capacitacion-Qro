import { supabase } from "@/lib/supabase/client"

/**
 * Ideas de mejora del sistema (tabla improvement_ideas).
 * Cualquier usuario autenticado envía; solo dev lee y cambia el estado (RLS).
 */

export type EstadoIdea = "nueva" | "en_revision" | "hecha"

export const ESTADOS_IDEA: readonly { value: EstadoIdea; label: string }[] = [
  { value: "nueva", label: "Nueva" },
  { value: "en_revision", label: "En revisión" },
  { value: "hecha", label: "Hecha" },
]

export const SECCION_GENERAL = "General"
/** Igual que el CHECK de longitud en la tabla. */
export const IDEA_MAX = 500

export interface Idea {
  id: string
  texto: string
  seccion: string
  autor: string
  /** Marca de tiempo ISO. */
  creada: string
  estado: EstadoIdea
}

const TABLA = "improvement_ideas"
const CACHE_TTL_MS = 60_000

type IdeaRow = {
  id: string
  idea: string
  section: string
  author_name: string
  created_at: string
  status: EstadoIdea
}

let cachedIdeas: { rows: Idea[]; at: number } | null = null
let inflightIdeas: Promise<Idea[]> | null = null
let authResetRegistered = false

function ensureAuthReset() {
  if (authResetRegistered || typeof window === "undefined") return
  authResetRegistered = true
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") invalidarIdeasCache()
  })
}

export function obtenerIdeasCache(): Idea[] | null {
  if (!cachedIdeas || Date.now() - cachedIdeas.at >= CACHE_TTL_MS) return null
  return cachedIdeas.rows
}

export function invalidarIdeasCache() {
  cachedIdeas = null
  inflightIdeas = null
}

/** Lista de ideas de la más reciente a la más antigua (solo dev puede leerlas). */
export async function cargarIdeas(force = false): Promise<Idea[]> {
  ensureAuthReset()
  if (!force) {
    const cached = obtenerIdeasCache()
    if (cached) return cached
    if (inflightIdeas) return inflightIdeas
  }

  const request = (async () => {
    const { data, error } = await supabase
      .from(TABLA)
      .select("id,idea,section,author_name,created_at,status")
      .order("created_at", { ascending: false })
    if (error) throw error
    const rows = ((data ?? []) as IdeaRow[]).map((row) => ({
      id: row.id,
      texto: row.idea,
      seccion: row.section,
      autor: row.author_name,
      creada: row.created_at,
      estado: row.status,
    }))
    cachedIdeas = { rows, at: Date.now() }
    return rows
  })()

  inflightIdeas = request
  try {
    return await request
  } finally {
    if (inflightIdeas === request) inflightIdeas = null
  }
}

/** Sin devolver la fila: quien envía no necesariamente puede leer la lista (RLS). */
export async function enviarIdea(texto: string, seccion: string): Promise<void> {
  const { error } = await supabase.from(TABLA).insert({ idea: texto.trim(), section: seccion })
  if (error) throw error
  invalidarIdeasCache()
}

export async function cambiarEstadoIdea(id: string, estado: EstadoIdea): Promise<void> {
  const { error } = await supabase.from(TABLA).update({ status: estado }).eq("id", id)
  if (error) throw error
  if (cachedIdeas) {
    cachedIdeas = {
      rows: cachedIdeas.rows.map((item) => (item.id === id ? { ...item, estado } : item)),
      at: Date.now(),
    }
  }
}
