"use client"

import { useState, useCallback, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { notify } from "@/lib/notify"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { generarFolioExamen } from "@/lib/utils"
import type { PreguntaExamen } from "./useExamenes"
import { describeSupabaseError } from "@/lib/supabase/errors"

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
  id,
  empleado_id,
  departamento,
  categoria_actual,
  categoria_destino,
  preguntas,
  created_at,
  empleado:employees(nombre, numero)
`

const CACHE_TTL_MS = 60_000
let cachedList: { data: ExamenHistorial[]; at: number } | null = null
let inflightList: Promise<ExamenHistorial[]> | null = null
const examenCache = new Map<string, { data: ExamenHistorial; at: number }>()
const inflightById = new Map<string, Promise<ExamenHistorial | null>>()
let authListenerRegistered = false

export function invalidarHistorialExamenesCache() {
  cachedList = null
  inflightList = null
  examenCache.clear()
  inflightById.clear()
}

function ensureCacheAuthReset() {
  if (authListenerRegistered || typeof window === "undefined") return
  authListenerRegistered = true
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") invalidarHistorialExamenesCache()
  })
}

function normalizeHistorialRow(row: unknown): ExamenHistorial {
  const item = row as Omit<ExamenHistorial, "empleado"> & {
    empleado?: ExamenHistorial["empleado"] | ExamenHistorial["empleado"][]
  }
  return {
    ...item,
    empleado: Array.isArray(item.empleado) ? (item.empleado[0] ?? null) : (item.empleado ?? null),
  }
}

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

/** Lee un examen ya cargado en memoria (evita recargar al abrir desde el historial). */
export function obtenerExamenHistorialCache(id: string): ExamenHistorial | null {
  ensureCacheAuthReset()
  const entry = examenCache.get(id)
  if (!entry) return null
  return entry.data
}

/** Un examen del historial por id; null si no existe. */
export async function obtenerExamenHistorial(id: string, force = false): Promise<ExamenHistorial | null> {
  ensureCacheAuthReset()
  const cached = examenCache.get(id)
  if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data
  }
  const inflight = inflightById.get(id)
  if (!force && inflight) return inflight

  const request = (async (): Promise<ExamenHistorial | null> => {
    const { data, error } = await supabase
      .from("historial_examenes")
      .select(HISTORIAL_SELECT)
      .eq("id", id)
      .maybeSingle()
    if (error) throw error
    if (!data) {
      examenCache.delete(id)
      return null
    }
    const normalized = normalizeHistorialRow(data)
    examenCache.set(id, { data: normalized, at: Date.now() })
    return normalized
  })().finally(() => {
    inflightById.delete(id)
  })

  inflightById.set(id, request)
  return request
}

async function fetchHistorialList(force = false): Promise<ExamenHistorial[]> {
  ensureCacheAuthReset()
  if (!force && cachedList && Date.now() - cachedList.at < CACHE_TTL_MS) {
    return cachedList.data
  }
  if (!force && inflightList) return inflightList

  const request = (async (): Promise<ExamenHistorial[]> => {
    const { data, error } = await supabase
      .from("historial_examenes")
      .select(HISTORIAL_SELECT)
      .order("created_at", { ascending: false })
      .limit(100)
    if (error) throw error

    const now = Date.now()
    const list = (data ?? []).map(normalizeHistorialRow)
    cachedList = { data: list, at: now }
    for (const ex of list) {
      examenCache.set(ex.id, { data: ex, at: now })
    }
    return list
  })().finally(() => {
    inflightList = null
  })

  inflightList = request
  return request
}

function filtrarExamenes(list: ExamenHistorial[], term: string): ExamenHistorial[] {
  const t = term.trim().toLowerCase()
  if (!t) return list
  return list.filter((ex) =>
    ex.id.toLowerCase().includes(t) ||
    folioExamen(ex).toLowerCase().includes(t) ||
    (ex.empleado?.nombre?.toLowerCase().includes(t) ?? false) ||
    (ex.empleado?.numero?.toLowerCase().includes(t) ?? false)
  )
}

export function useHistorialExamenes() {
  const [examenes, setExamenes] = useState<ExamenHistorial[]>(() => cachedList?.data ?? [])
  const [loading, setLoading] = useState(() => cachedList === null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ensureCacheAuthReset()
  }, [])

  const buscar = useCallback(async (term: string, force = false) => {
    const hasFreshCache = !force && cachedList !== null && Date.now() - cachedList.at < CACHE_TTL_MS
    if (hasFreshCache) {
      setExamenes(filtrarExamenes(cachedList!.data, term))
      setLoading(false)
      setError(null)
      return
    }
    if (cachedList === null) setLoading(true)
    setError(null)
    try {
      const list = await fetchHistorialList(force)
      setExamenes(filtrarExamenes(list, term))
    } catch (e: unknown) {
      setError(describeSupabaseError(e, "No se pudo cargar el historial"))
      notify.error("No se pudo cargar el historial de exámenes")
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

      examenCache.delete(id)
      if (cachedList) {
        cachedList = { data: cachedList.data.filter((ex) => ex.id !== id), at: cachedList.at }
      }
      setExamenes((prev) => prev.filter((ex) => ex.id !== id))
      notify.success("Examen eliminado")
      return true
    } catch (e: unknown) {
      console.error(e)
      notify.error("No se pudo eliminar el examen")
      return false
    }
  }, [])

  return { examenes, loading, error, buscar, eliminar }
}
