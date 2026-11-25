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
  const [loading, setLoading] = useState(Boolean(activo && userId))
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)
  const avisosRef = useRef(avisos)
  avisosRef.current = avisos
  // Siempre la última función, sin volver a suscribirse al cambiar.
  const onNuevoRef = useRef(onNuevo)
  onNuevoRef.current = onNuevo

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const cargar = useCallback(async (mostrarCarga = false) => {
    if (!userId) return
    const currentRequest = ++requestIdRef.current
    if (mostrarCarga) setLoading(true)
    const hoy = hoyISO()
    const [avisosResult, tarjetasResult] = await Promise.all([
      supabase.from(TABLA).select(KANBAN_AVISOS_SELECT).order("created_at", { ascending: false }).limit(LIMITE_AVISOS),
      supabase.from("kanban_tarjetas").select("id,titulo,estado,prioridad,fecha_limite,created_at")
        .neq("estado", "concluido").gte("fecha_limite", hoy).lte("fecha_limite", sumarDias(hoy, 1))
        .or(`responsable_id.eq.${userId},colaboradores.cs.{${userId}}`),
    ])
    if (!mountedRef.current || currentRequest !== requestIdRef.current) return
    const fallo = avisosResult.error ?? tarjetasResult.error
    if (fallo) {
      setError(describeSupabaseError(fallo, "No se pudieron cargar los avisos"))
      setLoading(false)
      return
    }
    setError(null)
    setAvisos((avisosResult.data ?? []) as unknown as KanbanAviso[])
    setPorVencer(ordenarTarjetas((tarjetasResult.data ?? []) as unknown as KanbanTarjeta[]) as TarjetaPorVencer[])
    setLoading(false)
  }, [userId])

  const recargar = useCallback(() => cargar(false), [cargar])

  useEffect(() => {
    if (!activo || !userId) {
      requestIdRef.current += 1
      setAvisos([])
      setPorVencer([])
      setError(null)
      setLoading(false)
      return
    }
    let active = true
    void cargar(true)

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
    const porMarcar = ids.filter(id => avisosRef.current.some(aviso => aviso.id === id && !aviso.leido))
    if (!porMarcar.length) return
    const marcadosSet = new Set(porMarcar)
    setAvisos(current => current.map(aviso => marcadosSet.has(aviso.id) ? { ...aviso, leido: true } : aviso))
    const { error: dbError } = await supabase.from(TABLA).update({ leido: true }).in("id", porMarcar)
    if (dbError) {
      if (mountedRef.current) {
        setAvisos(current => current.map(aviso => marcadosSet.has(aviso.id) ? { ...aviso, leido: false } : aviso))
      }
      throw new Error(describeSupabaseError(dbError, "No se pudieron marcar los avisos"))
    }
  }, [])

  return { avisos, porVencer, loading, error, recargar, marcarLeidos }
}
