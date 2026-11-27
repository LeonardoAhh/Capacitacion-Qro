import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { notify } from '@/lib/notify'
import { describeSupabaseError } from '@/lib/supabase/errors'
import { estadoVentanaEvaluacion, type HitoNuevoIngreso } from '@/lib/desempeno/hitos-nuevo-ingreso'
import { numeroEmpleadoEnUso } from '@/lib/validations/numero-empleado-en-uso'

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export type TipoContrato = 'A prueba' | 'Indeterminado'
export type EstadoRG = 'Pendiente' | 'Entregado'

export interface NuevoIngreso {
  id: string
  numero: string | null
  nombre: string
  puesto: string | null
  departamento: string | null
  area: string | null
  turno: string | null
  fecha_ingreso: string           // YYYY-MM-DD
  curp: string | null
  escolaridad: string | null
  jefe_area: string | null
  eval_1_fecha: string | null
  eval_1_calificacion: number | null
  eval_2_fecha: string | null
  eval_2_calificacion: number | null
  eval_3_fecha: string | null
  eval_3_calificacion: number | null
  termino_contrato: string | null
  tipo_contrato: TipoContrato
  rg_rec_048: EstadoRG
  fecha_vencimiento_rg: string | null
  // Datos personales adicionales
  fecha_nacimiento: string | null      // YYYY-MM-DD
  email: string | null                 // correo personal del colaborador
  cumple_enviado_year: number | null   // año del último envío de felicitación
  created_at: string
  updated_at: string
}

export type NuevoIngresoUpdate = Partial<Omit<NuevoIngreso, 'id' | 'created_at' | 'updated_at'>>


// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de fecha
// ─────────────────────────────────────────────────────────────────────────────


/** YYYY-MM-DD → DD/MM/YYYY para mostrar */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Añade N días a una fecha ISO sin zona horaria */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return date.toISOString().split('T')[0]
}

/**
 * Fechas que dependen del ingreso: evaluaciones a 30, 60 y 80 días, fin del contrato a prueba
 * (90) y vencimiento del RG-REC-048 (7 días en Calidad, 60 en los demás).
 */
export function fechasDeIngreso(fechaIngreso: string, departamento: string | null) {
  const enCalidad = (departamento ?? '').trim().toUpperCase() === 'CALIDAD'
  return {
    eval_1_fecha: addDays(fechaIngreso, 30),
    eval_2_fecha: addDays(fechaIngreso, 60),
    eval_3_fecha: addDays(fechaIngreso, 80),
    termino_contrato: addDays(fechaIngreso, 90),
    fecha_vencimiento_rg: addDays(fechaIngreso, enCalidad ? 7 : 60),
  }
}

/** Datos que comparten el seguimiento de ingreso y Plantilla; se mantienen iguales en los dos. */
const COMPARTIDOS = ['departamento', 'area', 'puesto', 'turno'] as const

/** Diferencia en días entre hoy y una fecha ISO (negativo = pasado) */
export function daysFromToday(iso: string | null): number | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  const target = Date.UTC(y, m - 1, d)
  const today = new Date()
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((target - todayUTC) / 86400000)
}

export type EvalStatus = 'completada' | 'disponible' | 'proxima' | 'hoy' | 'vencida' | 'pendiente'

export function evalStatus(fecha: string | null, calificacion: number | null, numeroEvaluacion: HitoNuevoIngreso): EvalStatus {
  if (calificacion != null) return 'completada'
  const diff = daysFromToday(fecha)
  if (diff === null) return 'pendiente'
  const estadoVentana = estadoVentanaEvaluacion(numeroEvaluacion, diff)
  if (estadoVentana === 'disponible') return 'disponible'
  if (estadoVentana === 'vencido') return 'vencida'
  if (diff < 0) return 'vencida'
  if (diff === 0) return 'hoy'
  if (diff <= 7) return 'proxima'
  return 'pendiente'
}

/** Algo del seguimiento ya venció: una evaluación sin calificar o el RG-REC-048 sin entregar. */
export function requiereAtencion(r: NuevoIngreso): boolean {
  const evaluaciones = [
    evalStatus(r.eval_1_fecha, r.eval_1_calificacion, 1),
    evalStatus(r.eval_2_fecha, r.eval_2_calificacion, 2),
    evalStatus(r.eval_3_fecha, r.eval_3_calificacion, 3),
  ]
  const rgDias = daysFromToday(r.fecha_vencimiento_rg)
  return evaluaciones.includes('vencida') || (r.rg_rec_048 !== 'Entregado' && rgDias !== null && rgDias < 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useNuevoIngreso() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Stable reference so components can depend on it in useEffect / useCallback
  // without triggering re-fetch loops.
  const fetchAll = useCallback(async (): Promise<NuevoIngreso[]> => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('nuevo_ingreso')
        .select('*')
        .order('fecha_ingreso', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as NuevoIngreso[]
    } catch (err) {
      const msg = describeSupabaseError(err, 'No se pudieron cargar los registros')
      notify.error(msg)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const importRecords = async (raw: unknown[]): Promise<{ success: boolean; error?: string }> => {
    setSaving(true)
    try {
      if (raw.length === 0) throw new Error('No hay registros para importar')
      const { error } = await supabase.from('nuevo_ingreso').insert(raw)
      if (error) throw error
      notify.success(`${raw.length} registros importados`)
      return { success: true }
    } catch (err) {
      const msg = describeSupabaseError(err, 'No se pudo importar')
      notify.error(msg)
      return { success: false, error: msg }
    } finally {
      setSaving(false)
    }
  }

  const updateRecord = async (id: string, updates: NuevoIngresoUpdate): Promise<{ success: boolean; error?: string }> => {
    setSaving(true)
    try {
      const { data: actualizado, error } = await supabase
        .from('nuevo_ingreso')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('numero')
        .single()
      if (error) throw error
      // Lo mismo en Plantilla, por número; si falla, lo guardado aquí se queda y se avisa.
      const compartidos = Object.fromEntries(COMPARTIDOS.filter(key => key in updates).map(key => [key, updates[key] ?? null]))
      const { error: plantillaError } = actualizado?.numero && Object.keys(compartidos).length
        ? await supabase.from('employees').update(compartidos).eq('numero', actualizado.numero)
        : { error: null }
      if (plantillaError) notify.warning('Seguimiento actualizado', { description: 'No se pudo actualizar en Plantilla' })
      else notify.success('Seguimiento actualizado')
      return { success: true }
    } catch (err) {
      const msg = describeSupabaseError(err, 'No se pudo actualizar')
      notify.error(msg)
      return { success: false, error: msg }
    } finally {
      setSaving(false)
    }
  }

  const deleteRecord = async (id: string): Promise<{ success: boolean; error?: string }> => {
    setSaving(true)
    try {
      const { error } = await supabase.from('nuevo_ingreso').delete().eq('id', id)
      if (error) throw error
      notify.success('Registro eliminado')
      return { success: true }
    } catch (err) {
      const msg = describeSupabaseError(err, 'No se pudo eliminar')
      notify.error(msg)
      return { success: false, error: msg }
    } finally {
      setSaving(false)
    }
  }

  /**
   * Alta única: guarda en Plantilla y en el seguimiento de ingreso a la vez. Si su número ya está en
   * Plantilla (alguien que regresa), no lo duplica y lo avisa. Si Plantilla falla, quita el
   * seguimiento para no dejar el alta a medias.
   */
  const createRecord = async (
    data: Omit<NuevoIngreso, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<{ success: boolean; error?: string }> => {
    setSaving(true)
    let ingresoId: string | null = null
    try {
      const enPlantilla = data.numero ? await numeroEmpleadoEnUso('employees', data.numero) : null
      const { data: creado, error } = await supabase.from('nuevo_ingreso').insert([data]).select('id').single()
      if (error) throw error
      ingresoId = creado.id
      if (!enPlantilla) {
        const { error: plantillaError } = await supabase.from('employees').insert([{
          numero: data.numero,
          nombre: data.nombre,
          puesto: data.puesto,
          departamento: data.departamento,
          area: data.area,
          turno: data.turno,
          fecha_ingreso: data.fecha_ingreso,
          // En Plantilla el jefe de área se llama "jefe directo".
          jefe_directo: data.jefe_area,
          evaluacion_desempeno: null,
        }])
        if (plantillaError) throw plantillaError
      }
      notify.success('Empleado registrado', enPlantilla ? { description: 'Ya estaba en Plantilla; se agregó su seguimiento' } : undefined)
      return { success: true }
    } catch (err) {
      if (ingresoId) await supabase.from('nuevo_ingreso').delete().eq('id', ingresoId)
      const msg = describeSupabaseError(err, 'No se pudo registrar al empleado')
      notify.error(msg)
      return { success: false, error: msg }
    } finally {
      setSaving(false)
    }
  }

  return { loading, saving, fetchAll, importRecords, updateRecord, deleteRecord, createRecord }
}
