"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { notify } from "@/lib/notify"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { generarFolioExamen } from "@/lib/utils"
import type { PreguntaExamen } from "./useExamenes"

export interface ExamenHistorial {
  id: string
  empleado_id: string
  departamento: string
  categoria_actual: string
  categoria_destino: string
  preguntas: PreguntaExamen[]
  created_at: string
  empleado?: {
    nombre: string
    numero: string | null
  } | null
}

const HISTORIAL_SELECT = `
  *,
  empleado:employees(nombre, numero)
`

/** Folio legible del examen (mismo formato en el historial y en la hoja de respuestas). */
export function folioExamen(examen: ExamenHistorial) {
  return generarFolioExamen(examen.id, examen.empleado?.numero, examen.created_at)
}

/** Fecha de generación, p. ej. "23 de noviembre, 2026". */
export function formatFechaExamen(iso: string) {
  try {
    return format(new Date(iso), "dd 'de' MMMM, yyyy", { locale: es })
  } catch {
    return iso
  }
}

/** Un examen del historial por id; null si no existe. */
export async function obtenerExamenHistorial(id: string): Promise<ExamenHistorial | null> {
  const { data, error } = await supabase
    .from("historial_examenes")
    .select(HISTORIAL_SELECT)
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return (data as ExamenHistorial | null) ?? null
}

export function useHistorialExamenes() {
  const [examenes, setExamenes] = useState<ExamenHistorial[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buscar = useCallback(async (term: string) => {
    setLoading(true)
    setError(null)
    try {
      // Traemos los últimos 100 exámenes generados
      const { data, error: err } = await supabase
        .from("historial_examenes")
        .select(HISTORIAL_SELECT)
        .order("created_at", { ascending: false })
        .limit(100)
      
      if (err) throw err
      
      let resultados = (data as any) ?? []
      
      // Filtrado en el cliente para búsqueda rápida (por folio o nombre)
      if (term.trim()) {
        const t = term.trim().toLowerCase()
        resultados = resultados.filter((ex: any) => 
          ex.id.toLowerCase().includes(t) ||
          ex.empleado?.nombre?.toLowerCase().includes(t) ||
          ex.empleado?.numero?.toLowerCase().includes(t)
        )
      }

      setExamenes(resultados as ExamenHistorial[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar historial")
      notify.error("Error al cargar historial de exámenes")
    } finally {
      setLoading(false)
    }
  }, [])

  const eliminar = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("historial_examenes")
        .delete()
        .eq("id", id)

      if (error) throw error

      setExamenes((prev) => prev.filter((ex) => ex.id !== id))
      notify.success("Examen eliminado correctamente")
      return true
    } catch (e: unknown) {
      console.error(e)
      notify.error("Error al eliminar el examen")
      return false
    }
  }, [])

  return { examenes, loading, error, buscar, eliminar }
}
