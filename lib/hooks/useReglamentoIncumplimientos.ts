"use client"

import { useCallback, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { describeSupabaseError } from "@/lib/supabase/errors"

export interface ReglamentoIncumplimiento {
  numero_empleado: string
  mes: string
  dia: number
  cantidad: number
}

export function useReglamentoIncumplimientos() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchByEmpleado = useCallback(async (numeroEmpleado: string) => {
    try {
      const { data, error: dbError } = await supabase
        .from("incumplimientos_reglamento")
        .select("numero_empleado, mes, dia, cantidad")
        .eq("numero_empleado", numeroEmpleado)
        .order("mes", { ascending: false })
        .order("dia", { ascending: true })
      if (dbError) throw dbError
      return (data ?? []) as ReglamentoIncumplimiento[]
    } catch (caught) {
      const message = describeSupabaseError(caught, "Error al cargar incumplimientos")
      setError(message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const reloadByEmpleado = useCallback(async (numeroEmpleado: string) => {
    setLoading(true)
    setError(null)
    return fetchByEmpleado(numeroEmpleado)
  }, [fetchByEmpleado])

  const saveForEmpleadoDia = useCallback(async (
    numeroEmpleado: string,
    fecha: string,
    cantidad: number,
    cantidadAnterior: number | null,
  ) => {
    setSaving(true)
    setError(null)
    try {
      const { error: dbError } = await supabase.rpc(
        "registrar_incumplimiento_reglamento",
        {
          p_numero_empleado: numeroEmpleado,
          p_fecha: fecha,
          p_cantidad: cantidad,
          p_cantidad_anterior: cantidadAnterior,
        },
      )
      if (dbError) throw dbError
      return { success: true }
    } catch (caught) {
      const message = describeSupabaseError(caught, "Error al guardar el incumplimiento")
      setError(message)
      return { success: false, error: message }
    } finally {
      setSaving(false)
    }
  }, [])

  return {
    loading,
    saving,
    error,
    fetchByEmpleado,
    reloadByEmpleado,
    saveForEmpleadoDia,
  }
}
