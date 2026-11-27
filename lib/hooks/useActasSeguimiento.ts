"use client"

import { useCallback, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { describeSupabaseError } from "@/lib/supabase/errors"
import { notify } from "@/lib/notify"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ActaTipo = "ACTA ADMINISTRATIVA"
export type ActaEstatus = "ACTIVO" | "EN SEGUIMIENTO" | "CERRADO"

export const ACTA_ESTATUSES: ActaEstatus[] = ["ACTIVO", "EN SEGUIMIENTO", "CERRADO"]

export interface ActaSeguimiento {
  id: string
  numero_empleado: string
  tipo: ActaTipo
  fecha: string           // ISO date (YYYY-MM-DD)
  descripcion: string | null
  fecha_seguimiento: string | null  // ISO date
  estatus: ActaEstatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ActaSeguimientoInsert = Omit<ActaSeguimiento, "id" | "created_at" | "updated_at">
export type ActaSeguimientoUpdate = Partial<Omit<ActaSeguimiento, "id" | "created_at" | "updated_at" | "numero_empleado">>

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useActasSeguimiento() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  /** Fetch administrative actas for a given employee number, newest first */
  const fetchByEmpleado = useCallback(async (numero: string): Promise<ActaSeguimiento[]> => {
    setLoading(true)
    try {
      const { data, error: dbError } = await supabase
        .from("actas_seguimiento")
        .select("*")
        .eq("numero_empleado", numero)
        .eq("tipo", "ACTA ADMINISTRATIVA")
        .order("fecha", { ascending: false })
      if (dbError) throw new Error(dbError.message)
      return (data ?? []) as ActaSeguimiento[]
    } catch (err) {
      notify.error(describeSupabaseError(err, "No se pudieron cargar las actas"))
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  /** Insert a new administrative acta. */
  const create = useCallback(
    async (payload: ActaSeguimientoInsert): Promise<{ success: boolean; error?: string }> => {
      setSaving(true)
      try {
        const { error: dbError } = await supabase
          .from("actas_seguimiento")
          .insert([payload])
        if (dbError) throw new Error(dbError.message)
        return { success: true }
      } catch (err) {
        return { success: false, error: describeSupabaseError(err, "No se pudo guardar") }
      } finally {
        setSaving(false)
      }
    },
    [],
  )

  /** Update estatus or any field by id */
  const update = useCallback(
    async (id: string, patch: ActaSeguimientoUpdate): Promise<{ success: boolean; error?: string }> => {
      setSaving(true)
      try {
        const { error: dbError } = await supabase
          .from("actas_seguimiento")
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq("id", id)
        if (dbError) throw new Error(dbError.message)
        return { success: true }
      } catch (err) {
        return { success: false, error: describeSupabaseError(err, "No se pudo actualizar") }
      } finally {
        setSaving(false)
      }
    },
    [],
  )

  /** Delete an administrative acta by id. */
  const remove = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      setSaving(true)
      try {
        const { error: dbError } = await supabase
          .from("actas_seguimiento")
          .delete()
          .eq("id", id)
        if (dbError) throw new Error(dbError.message)
        return { success: true }
      } catch (err) {
        return { success: false, error: describeSupabaseError(err, "No se pudo eliminar") }
      } finally {
        setSaving(false)
      }
    },
    [],
  )

  return { loading, saving, fetchByEmpleado, create, update, remove }
}

/** Fetch all open administrative actas across all employees. */
export async function fetchActasAbiertas(): Promise<ActaSeguimiento[]> {
  const { data, error } = await supabase
    .from("actas_seguimiento")
    .select("*")
    .in("estatus", ["ACTIVO", "EN SEGUIMIENTO"])
    .order("fecha_seguimiento", { ascending: true, nullsFirst: false })
  if (error) return []
  return (data ?? []) as ActaSeguimiento[]
}
