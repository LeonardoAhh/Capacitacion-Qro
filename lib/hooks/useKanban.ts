"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { describeSupabaseError } from "@/lib/supabase/errors"
import {
  hoyISO, KANBAN_COLUMNS_SELECT, KANBAN_COMENTARIOS_SELECT, KANBAN_PASOS_SELECT, KANBAN_PLANTILLAS_SELECT,
  type DatosPlantilla, type DatosTarjeta, type KanbanComentario, type KanbanEstado, type KanbanMiembro, type KanbanPaso,
  type KanbanPlantilla, type KanbanTarjeta,
} from "@/lib/kanban"

const TABLA = "kanban_tarjetas"
const TABLA_PLANTILLAS = "kanban_plantillas"
const TABLA_MI_DIA = "kanban_mi_dia"
const TABLA_PASOS = "kanban_checklist"
const TABLA_COMENTARIOS = "kanban_comentarios"

/** Campos que se pueden cambiar desde el tablero (formulario y acciones rápidas). */
export type CambiosTarjeta = Partial<DatosTarjeta & Pick<KanbanTarjeta, "necesita_apoyo" | "apoyo_nota" | "bloqueo_motivo">>

function upsert<T extends { id: string }>(list: T[], tarjeta: T): T[] {
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
  const [plantillas, setPlantillas] = useState<KanbanPlantilla[]>([])
  const [pasos, setPasos] = useState<KanbanPaso[]>([])
  const [comentarios, setComentarios] = useState<KanbanComentario[]>([])
  /** Tarjetas que la persona agregó a su día de hoy. */
  const [miDia, setMiDia] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Última lista conocida, para revertir un movimiento optimista.
  const tarjetasRef = useRef(tarjetas)
  tarjetasRef.current = tarjetas
  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const cargar = useCallback(async () => {
    const currentRequest = ++requestIdRef.current
    setLoading(true)
    setError(null)
    // RLS limita "Mi día" a las filas de quien consulta.
    const [tarjetasResult, miembrosResult, plantillasResult, miDiaResult, pasosResult, comentariosResult] = await Promise.all([
      supabase.from(TABLA).select(KANBAN_COLUMNS_SELECT).order("created_at"),
      supabase.rpc("kanban_miembros"),
      supabase.from(TABLA_PLANTILLAS).select(KANBAN_PLANTILLAS_SELECT).order("nombre"),
      supabase.from(TABLA_MI_DIA).select("tarjeta_id").eq("fecha", hoyISO()),
      supabase.from(TABLA_PASOS).select(KANBAN_PASOS_SELECT).order("created_at"),
      supabase.from(TABLA_COMENTARIOS).select(KANBAN_COMENTARIOS_SELECT).order("created_at"),
    ])
    if (!mountedRef.current || currentRequest !== requestIdRef.current) return
    const fallo = tarjetasResult.error ?? miembrosResult.error ?? plantillasResult.error ?? miDiaResult.error
      ?? pasosResult.error ?? comentariosResult.error
    if (fallo) {
      setError(describeSupabaseError(fallo, "No se pudo cargar el tablero"))
    } else {
      setTarjetas((tarjetasResult.data ?? []) as unknown as KanbanTarjeta[])
      setMiembros(((miembrosResult.data ?? []) as KanbanMiembro[])
        .sort((left, right) => left.nombre.localeCompare(right.nombre, "es")))
      setPlantillas((plantillasResult.data ?? []) as unknown as KanbanPlantilla[])
      setMiDia(new Set(((miDiaResult.data ?? []) as { tarjeta_id: string }[]).map(row => row.tarjeta_id)))
      setPasos((pasosResult.data ?? []) as unknown as KanbanPaso[])
      setComentarios((comentariosResult.data ?? []) as unknown as KanbanComentario[])
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
      .on("postgres_changes", { event: "*", schema: "public", table: TABLA_PLANTILLAS }, payload => {
        if (!active) return
        if (payload.eventType === "DELETE") {
          const id = (payload.old as { id?: string }).id
          if (id) setPlantillas(current => current.filter(plantilla => plantilla.id !== id))
          return
        }
        setPlantillas(current => upsert(current, payload.new as KanbanPlantilla))
      })
      .on("postgres_changes", { event: "*", schema: "public", table: TABLA_PASOS }, payload => {
        if (!active) return
        if (payload.eventType === "DELETE") {
          const id = (payload.old as { id?: string }).id
          if (id) setPasos(current => current.filter(paso => paso.id !== id))
          return
        }
        setPasos(current => upsert(current, payload.new as KanbanPaso))
      })
      .on("postgres_changes", { event: "*", schema: "public", table: TABLA_COMENTARIOS }, payload => {
        if (!active) return
        if (payload.eventType === "DELETE") {
          const id = (payload.old as { id?: string }).id
          if (id) setComentarios(current => current.filter(comentario => comentario.id !== id))
          return
        }
        setComentarios(current => upsert(current, payload.new as KanbanComentario))
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

  const actualizar = useCallback(async (id: string, datos: CambiosTarjeta) => {
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
    setMiDia(current => {
      const next = new Set(current)
      next.delete(id)
      return next
    })
  }, [])

  /** Agrega o quita la tarjeta del día de hoy de quien usa el tablero. */
  const alternarMiDia = useCallback(async (id: string, agregar: boolean) => {
    const { error: dbError } = agregar
      ? await supabase.from(TABLA_MI_DIA).insert({ tarjeta_id: id, fecha: hoyISO() })
      : await supabase.from(TABLA_MI_DIA).delete().eq("tarjeta_id", id).eq("fecha", hoyISO())
    if (dbError) throw new Error(describeSupabaseError(dbError, "No se pudo actualizar tu día"))
    setMiDia(current => {
      const next = new Set(current)
      if (agregar) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const crearPlantilla = useCallback(async (datos: DatosPlantilla) => {
    const { data, error: dbError } = await supabase.from(TABLA_PLANTILLAS).insert(datos)
      .select(KANBAN_PLANTILLAS_SELECT).single()
    if (dbError) throw new Error(describeSupabaseError(dbError, "No se pudo guardar la plantilla"))
    setPlantillas(current => upsert(current, data as unknown as KanbanPlantilla))
  }, [])

  const eliminarPlantilla = useCallback(async (id: string) => {
    const { error: dbError } = await supabase.from(TABLA_PLANTILLAS).delete().eq("id", id)
    if (dbError) throw new Error(describeSupabaseError(dbError, "No se pudo eliminar la plantilla"))
    setPlantillas(current => current.filter(plantilla => plantilla.id !== id))
  }, [])

  const agregarPaso = useCallback(async (tarjetaId: string, texto: string) => {
    const { data, error: dbError } = await supabase.from(TABLA_PASOS).insert({ tarjeta_id: tarjetaId, texto })
      .select(KANBAN_PASOS_SELECT).single()
    if (dbError) throw new Error(describeSupabaseError(dbError, "No se pudo agregar el paso"))
    setPasos(current => upsert(current, data as unknown as KanbanPaso))
  }, [])

  /** Marcar o desmarcar es optimista: se revierte si falla. */
  const marcarPaso = useCallback(async (id: string, hecho: boolean) => {
    setPasos(current => current.map(paso => paso.id === id ? { ...paso, hecho } : paso))
    const { error: dbError } = await supabase.from(TABLA_PASOS).update({ hecho }).eq("id", id)
    if (dbError) {
      setPasos(current => current.map(paso => paso.id === id ? { ...paso, hecho: !hecho } : paso))
      throw new Error(describeSupabaseError(dbError, "No se pudo actualizar el paso"))
    }
  }, [])

  const eliminarPaso = useCallback(async (id: string) => {
    const { error: dbError } = await supabase.from(TABLA_PASOS).delete().eq("id", id)
    if (dbError) throw new Error(describeSupabaseError(dbError, "No se pudo eliminar el paso"))
    setPasos(current => current.filter(paso => paso.id !== id))
  }, [])

  const comentar = useCallback(async (tarjetaId: string, texto: string) => {
    const { data, error: dbError } = await supabase.from(TABLA_COMENTARIOS).insert({ tarjeta_id: tarjetaId, texto })
      .select(KANBAN_COMENTARIOS_SELECT).single()
    if (dbError) throw new Error(describeSupabaseError(dbError, "No se pudo publicar el comentario"))
    setComentarios(current => upsert(current, data as unknown as KanbanComentario))
  }, [])

  const eliminarComentario = useCallback(async (id: string) => {
    const { error: dbError } = await supabase.from(TABLA_COMENTARIOS).delete().eq("id", id)
    if (dbError) throw new Error(describeSupabaseError(dbError, "No se pudo eliminar el comentario"))
    setComentarios(current => current.filter(comentario => comentario.id !== id))
  }, [])

  return {
    tarjetas, miembros, plantillas, miDia, pasos, comentarios, loading, error, recargar: cargar,
    crear, actualizar, mover, eliminar, alternarMiDia, crearPlantilla, eliminarPlantilla,
    agregarPaso, marcarPaso, eliminarPaso, comentar, eliminarComentario,
  }
}
