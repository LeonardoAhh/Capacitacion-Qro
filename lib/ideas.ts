import { supabase } from "@/lib/supabase/client"

/**
 * Ideas de mejora del sistema (tabla improvement_ideas). Cualquiera con sesión envía;
 * solo dev lee la lista y cambia el estado (RLS). El autor lo pone la base de datos.
 */

export type EstadoIdea = "nueva" | "en_revision" | "hecha"

/** Estados en el orden en que avanzan, con su color (tokens del tema). */
export const ESTADOS_IDEA: readonly { value: EstadoIdea; label: string; dot: string }[] = [
  { value: "nueva", label: "Nueva", dot: "bg-muted-foreground" },
  { value: "en_revision", label: "En revisión", dot: "bg-chart-3" },
  { value: "hecha", label: "Hecha", dot: "bg-chart-1" },
]

/** Sección cuando la idea no es de una pantalla en particular. */
export const SECCION_GENERAL = "General"
/** Igual que los CHECK de la tabla. */
export const IDEA_MAX = 500

export interface Idea {
  id: string
  texto: string
  seccion: string
  autor: string
  /** ISO */
  creada: string
  estado: EstadoIdea
}

const TABLA = "improvement_ideas"

type IdeaRow = {
  id: string
  idea: string
  section: string
  author_name: string
  created_at: string
  status: EstadoIdea
}

/** Todas las ideas, de la más reciente a la más antigua (solo dev puede leerlas). */
export async function cargarIdeas(): Promise<Idea[]> {
  const { data, error } = await supabase.from(TABLA)
    .select("id,idea,section,author_name,created_at,status")
    .order("created_at", { ascending: false })
  if (error) throw error
  return ((data ?? []) as IdeaRow[]).map(row => ({
    id: row.id, texto: row.idea, seccion: row.section, autor: row.author_name, creada: row.created_at, estado: row.status,
  }))
}

/** Sin devolver la fila: quien envía no necesariamente puede leer la lista. */
export async function enviarIdea(texto: string, seccion: string): Promise<void> {
  const { error } = await supabase.from(TABLA).insert({ idea: texto.trim(), section: seccion })
  if (error) throw error
}

export async function cambiarEstadoIdea(id: string, estado: EstadoIdea): Promise<void> {
  const { error } = await supabase.from(TABLA).update({ status: estado }).eq("id", id)
  if (error) throw error
}
