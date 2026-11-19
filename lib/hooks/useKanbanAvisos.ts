"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { describeSupabaseError } from "@/lib/supabase/errors"
import {
  hoyISO, KANBAN_AVISOS_SELECT, LIMITE_AVISOS, ordenarTarjetas, sumarDias,
  type KanbanAviso, type KanbanTarjeta,
} from "@/lib/kanban"

const TABLA = "kanban_avisos"

export type TarjetaPorVencer = Pick<KanbanTarjeta, "id" | "titulo" | "estado" | "prioridad" | "fecha_limite" | "created_at">

/**
 * Avisos de la persona (RLS: solo los suyos) y sus tarjetas que vencen hoy o mañana.
 * `activo` evita consultar cuando el rol no usa el tablero.
 */
export function useKanbanAvisos(userId: string | null, activo: boolean, onNuevo?: (aviso: KanbanAviso) => void) {
  const [avisos, setAvisos] = useState<KanbanAviso[]>([])
  const [porVencer, setPorVencer] = useState<TarjetaPorVencer[]>([])
  const [error, setError] = useState<string | null>(null)
  // Siempre la última función, sin volver a suscribirse al cambiar.
  const onNuevoRef = useRef(onNuevo)
  onNuevoRef.current = onNuevo

  const cargar = useCallback(async () => {
    if (!userId) return
    const hoy = hoyISO()
    const [avisosResult, tarjetasResult] = await Promise.all([
      supabase.from(TABLA).select(KANBAN_AVISOS_SELECT).order("created_at", { ascending: false }).limit(LIMITE_AVISOS),
      supabase.from("kanban_tarjetas").select("id,titulo,estado,prioridad,fecha_limite,created_at")
        .neq("estado", "concluido").gte("fecha_limite", hoy).lte("fecha_limite", sumarDias(hoy, 1))
        .or(`responsable_id.eq.${userId},colaboradores.cs.{${userId}}`),
    ])
    const fallo = avisosResult.error ?? tarjetasResult.error
    if (fallo) {
      setError(describeSupabaseError(fallo, "No se pudieron cargar los avisos"))
      return
    }
    setError(null)
    setAvisos((avisosResult.data ?? []) as unknown as KanbanAviso[])
    setPorVencer(ordenarTarjetas((tarjetasResult.data ?? []) as unknown as KanbanTarjeta[]) as TarjetaPorVencer[])
  }, [userId])

  useEffect(() => {
    if (!activo || !userId) return
    let active = true
    void cargar()

    const channel = supabase
      .channel(`kanban_avisos_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: TABLA, filter: `user_id=eq.${userId}` }, payload => {
        if (!active) return
        const aviso = payload.new as KanbanAviso
        setAvisos(current => [aviso, ...current.filter(item => item.id !== aviso.id)].slice(0, LIMITE_AVISOS))
        onNuevoRef.current?.(aviso)
      })
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [activo, userId, cargar])

  const marcarLeidos = useCallback(async (ids: string[]) => {
    if (!ids.length) return
    setAvisos(current => current.map(aviso => ids.includes(aviso.id) ? { ...aviso, leido: true } : aviso))
    const { error: dbError } = await supabase.from(TABLA).update({ leido: true }).in("id", ids)
    if (dbError) {
      setAvisos(current => current.map(aviso => ids.includes(aviso.id) ? { ...aviso, leido: false } : aviso))
      throw new Error(describeSupabaseError(dbError, "No se pudieron marcar los avisos"))
    }
  }, [])

  return { avisos, porVencer, error, recargar: cargar, marcarLeidos }
}
