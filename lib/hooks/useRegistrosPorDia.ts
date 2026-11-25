"use client"

import { useCallback, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { describeSupabaseError } from "@/lib/supabase/errors"
import type { RegistroPorDia, RegistroPorDiaConfig, ValoresDia } from "@/lib/plantilla/registros-por-dia"

/** Lectura y captura individual de registros por día. */
export function useRegistrosPorDia(config: RegistroPorDiaConfig) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchByEmpleado = useCallback(async (numeroEmpleado: string) => {
    try {
      const { data, error: dbError } = await supabase
        .from(config.tabla)
        .select(config.conMinutos ? "numero_empleado, mes, dia, cantidad, minutos" : "numero_empleado, mes, dia, cantidad")
        .eq("numero_empleado", numeroEmpleado)
        .order("mes", { ascending: false })
        .order("dia", { ascending: true })
      if (dbError) throw dbError
      return (data ?? []) as unknown as RegistroPorDia[]
    } catch (caught) {
      setError(describeSupabaseError(caught, `Error al cargar ${config.plural}`))
      return []
    } finally {
      setLoading(false)
    }
  }, [config])

  const reloadByEmpleado = useCallback(async (numeroEmpleado: string) => {
    setLoading(true)
    setError(null)
    return fetchByEmpleado(numeroEmpleado)
  }, [fetchByEmpleado])

  const saveForEmpleadoDia = useCallback(async (
    numeroEmpleado: string,
    fecha: string,
    valores: ValoresDia,
    anterior: ValoresDia | null,
  ) => {
    setSaving(true)
    try {
      const { error: dbError } = await supabase.rpc(config.rpcRegistrar, {
        p_numero_empleado: numeroEmpleado,
        p_fecha: fecha,
        p_cantidad: valores.cantidad,
        p_cantidad_anterior: anterior?.cantidad ?? null,
        ...(config.conMinutos ? { p_minutos: valores.minutos, p_minutos_anterior: anterior?.minutos ?? null } : {}),
      })
      if (dbError) throw dbError
      return { success: true as const }
    } catch (caught) {
      return { success: false as const, error: describeSupabaseError(caught, `Error al guardar el ${config.singular}`) }
    } finally {
      setSaving(false)
    }
  }, [config])

  return { loading, saving, error, fetchByEmpleado, reloadByEmpleado, saveForEmpleadoDia }
}
