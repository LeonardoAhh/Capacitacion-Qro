"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { describeSupabaseError } from "@/lib/supabase/errors"
import { KANBAN_COLUMNS_SELECT, type DatosTarjeta, type KanbanEstado, type KanbanMiembro, type KanbanTarjeta } from "@/lib/kanban"

const TABLA = "kanban_tarjetas"

function upsert(list: KanbanTarjeta[], tarjeta: KanbanTarjeta): KanbanTarjeta[] {
  return list.some(item => item.id === tarjeta.id)
    ? list.map(item => item.id === tarjeta.id ? tarjeta : item)
    : [...list, tarjeta]
}

/**
 * Tablero compartido: carga inicial, integrantes y cambios en tiempo real de
 * cualquier persona del equipo. Las mutaciones actualizan el estado con la fila
 * que devuelve la base de datos (incluye autoría y fechas de cambio).
 */
export function useKanban() {
  const [tarjetas, setTarjetas] = useState<KanbanTarjeta[]>([])
  const [miembros, setMiembros] = useState<KanbanMiembro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Última lista conocida, para revertir un movimiento optimista.
  const tarjetasRef = useRef(tarjetas)
  tarjetasRef.current = tarjetas

  const cargar = useCallback(async () => {
    setError(null)
    const [tarjetasResult, miembrosResult] = await Promise.all([
      supabase.from(TABLA).select(KANBAN_COLUMNS_SELECT).order("created_at"),
      supabase.rpc("kanban_miembros"),
    ])
    if (tarjetasResult.error || miembrosResult.error) {
      setError(describeSupabaseError(tarjetasResult.error ?? miembrosResult.error, "No se pudo cargar el tablero"))
    } else {
      setTarjetas((tarjetasResult.data ?? []) as unknown as KanbanTarjeta[])
      setMiembros(((miembrosResult.data ?? []) as KanbanMiembro[])
        .sort((left, right) => left.nombre.localeCompare(right.nombre, "es")))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    void cargar()

    const channel = supabase
      .channel(`kanban_tarjetas_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: TABLA }, payload => {
        if (!active) return
        if (payload.eventType === "DELETE") {
          const id = (payload.old as { id?: string }).id
          if (id) setTarjetas(current => current.filter(tarjeta => tarjeta.id !== id))
          return
        }
        setTarjetas(current => upsert(current, payload.new as KanbanTarjeta))
      })
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [cargar])

  const crear = useCallback(async (datos: DatosTarjeta) => {
    const { data, error: dbError } = await supabase.from(TABLA).insert(datos).select(KANBAN_COLUMNS_SELECT).single()
    if (dbError) throw new Error(describeSupabaseError(dbError, "No se pudo crear la tarjeta"))
    setTarjetas(current => upsert(current, data as unknown as KanbanTarjeta))
  }, [])

  const actualizar = useCallback(async (id: string, datos: Partial<DatosTarjeta>) => {
    const { data, error: dbError } = await supabase.from(TABLA).update(datos).eq("id", id)
      .select(KANBAN_COLUMNS_SELECT).single()
    if (dbError) throw new Error(describeSupabaseError(dbError, "No se pudo guardar la tarjeta"))
    setTarjetas(current => upsert(current, data as unknown as KanbanTarjeta))
  }, [])

  /** Movimiento optimista: la tarjeta cambia de columna al instante y se revierte si falla. */
  const mover = useCallback(async (id: string, estado: KanbanEstado) => {
    const anterior = tarjetasRef.current.find(tarjeta => tarjeta.id === id)?.estado
    if (!anterior || anterior === estado) return
    setTarjetas(current => current.map(tarjeta => tarjeta.id === id ? { ...tarjeta, estado } : tarjeta))
    try {
      await actualizar(id, { estado })
    } catch (cause) {
      setTarjetas(current => current.map(tarjeta => tarjeta.id === id ? { ...tarjeta, estado: anterior } : tarjeta))
      throw cause
    }
  }, [actualizar])

  const eliminar = useCallback(async (id: string) => {
    const { error: dbError } = await supabase.from(TABLA).delete().eq("id", id)
    if (dbError) throw new Error(describeSupabaseError(dbError, "No se pudo eliminar la tarjeta"))
    setTarjetas(current => current.filter(tarjeta => tarjeta.id !== id))
  }, [])

  return { tarjetas, miembros, loading, error, recargar: cargar, crear, actualizar, mover, eliminar }
}
