import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { notify } from '@/lib/notify'
import { describeSupabaseError } from "@/lib/supabase/errors"

export interface CursoPublico {
  id: string
  nombre: string
  descripcion: string | null
  url: string
  imagen_url: string | null
  activo: boolean
  orden: number
  created_at: string
}

export type CursoPublicoInput = Omit<CursoPublico, 'id' | 'created_at'>

export function useCursosPublicos(soloActivos = false) {
  const [cursos, setCursos] = useState<CursoPublico[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCursos = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('cursos_publicos')
        .select('*')
        .order('orden', { ascending: true })
        .order('created_at', { ascending: true })

      if (soloActivos) {
        query = query.eq('activo', true)
      }

      const { data, error: err } = await query
      if (err) throw err
      setCursos(data ?? [])
    } catch (e) {
      notify.error(describeSupabaseError(e, 'No se pudieron cargar los cursos'))
    } finally {
      setLoading(false)
    }
  }, [soloActivos])

  useEffect(() => {
    fetchCursos()
  }, [fetchCursos])

  const crear = useCallback(async (input: CursoPublicoInput) => {
    const { error: err } = await supabase.from('cursos_publicos').insert(input)
    if (err) throw err
    await fetchCursos()
  }, [fetchCursos])

  const actualizar = useCallback(async (id: string, input: Partial<CursoPublicoInput>) => {
    const { error: err } = await supabase
      .from('cursos_publicos')
      .update(input)
      .eq('id', id)
    if (err) throw err
    await fetchCursos()
  }, [fetchCursos])

  const eliminar = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('cursos_publicos')
      .delete()
      .eq('id', id)
    if (err) throw err
    await fetchCursos()
  }, [fetchCursos])

  return { cursos, loading, refetch: fetchCursos, crear, actualizar, eliminar }
}
