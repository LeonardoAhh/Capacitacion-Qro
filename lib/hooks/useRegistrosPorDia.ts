"use client"

import { useCallback, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { describeSupabaseError } from "@/lib/supabase/errors"
import { textosRegistro, type RegistroPorDia, type RegistroPorDiaConfig, type ValoresDia } from "@/lib/plantilla/registros-por-dia"

/** Lectura y captura individual de registros por día. */
export function useRegistrosPorDia(config: RegistroPorDiaConfig) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchByEmpleado = useCallback(async (numeroEmpleado: string) => {
    try {
      const { data, error: dbError } = await supabase
        .from(config.tabla)
        .select(["numero_empleado, mes, dia, cantidad", config.conMinutos && "minutos", config.tipos && "tipos"].filter(Boolean).join(", "))
        .eq("numero_empleado", numeroEmpleado)
        .order("mes", { ascending: false })
        .order("dia", { ascending: true })
      if (dbError) throw dbError
      return (data ?? []) as unknown as RegistroPorDia[]
    } catch (caught) {
      setError(describeSupabaseError(caught, `No se pudieron cargar los ${config.plural}`))
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
      // Con tipos, la cantidad la calcula la base a partir de los tipos marcados.
      const { error: dbError } = await supabase.rpc(config.rpcRegistrar, {
        p_numero_empleado: numeroEmpleado,
        p_fecha: fecha,
        p_cantidad_anterior: anterior?.cantidad ?? null,
        ...(config.tipos
          ? { p_tipos: valores.tipos ?? [], p_tipos_anteriores: anterior ? anterior.tipos ?? [] : null }
          : { p_cantidad: valores.cantidad }),
        ...(config.conMinutos ? { p_minutos: valores.minutos, p_minutos_anterior: anterior?.minutos ?? null } : {}),
      })
      if (dbError) throw dbError
      return { success: true as const }
    } catch (caught) {
      return { success: false as const, error: describeSupabaseError(caught, `No se pudo guardar ${textosRegistro(config).elSingular}`) }
    } finally {
      setSaving(false)
    }
  }, [config])

  return { loading, saving, error, fetchByEmpleado, reloadByEmpleado, saveForEmpleadoDia }
}
