"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { describeSupabaseError } from "@/lib/supabase/errors"
import { fetchAllRows } from "@/lib/supabase/fetchAll"
import { textosRegistro, type RegistroPorDiaConfig } from "@/lib/plantilla/registros-por-dia"

export const SIN_DEPARTAMENTO = "Sin departamento"
/** Departamentos en la gráfica y personas en la tabla. */
const TOP = 10
const CHUNK_SIZE = 200

export interface RegistrosDia {
  /** Fecha "YYYY-MM-DD". */
  fecha: string
  /** Registros por departamento, en el orden de `departamentos`. */
  valores: number[]
}

export interface RegistrosEmpleado {
  numero: string
  nombre: string
  departamento: string
  cantidad: number
}

export interface RegistrosSemana {
  dias: RegistrosDia[]
  /** Top de departamentos por registros de la semana, de mayor a menor. */
  departamentos: string[]
  /** Top de empleados con registros en la semana, de más a menos. */
  empleados: RegistrosEmpleado[]
}

interface RegistroRow { numero_empleado: string; mes: string; dia: number; cantidad: number }
interface EmpleadoRow { numero: string; nombre: string | null; departamento: string | null }

const DAY_MS = 86_400_000

const toIso = (date: Date) => date.toISOString().slice(0, 10)
const fromIso = (fecha: string) => new Date(`${fecha}T00:00:00Z`)

/** Lunes ("YYYY-MM-DD") de la semana que contiene la fecha local dada. */
export function lunesDe(date: Date): string {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const diaSemana = (new Date(utc).getUTCDay() + 6) % 7
  return toIso(new Date(utc - diaSemana * DAY_MS))
}

export function sumarSemanas(lunes: string, semanas: number): string {
  return toIso(new Date(fromIso(lunes).getTime() + semanas * 7 * DAY_MS))
}

/** Número de semana ISO 8601 y su año (el del jueves de esa semana). */
export function semanaIso(lunes: string): { semana: number; anio: number } {
  const jueves = new Date(fromIso(lunes).getTime() + 3 * DAY_MS)
  const anio = jueves.getUTCFullYear()
  const primerJueves = Date.UTC(anio, 0, 4)
  const lunesSemana1 = primerJueves - ((new Date(primerJueves).getUTCDay() + 6) % 7) * DAY_MS
  return { semana: Math.floor((fromIso(lunes).getTime() - lunesSemana1) / (7 * DAY_MS)) + 1, anio }
}

/** Las 7 fechas de lunes a domingo. */
export function diasDeSemana(lunes: string): string[] {
  const inicio = fromIso(lunes).getTime()
  return Array.from({ length: 7 }, (_, index) => toIso(new Date(inicio + index * DAY_MS)))
}

const fechaDe = (row: RegistroRow) => `${row.mes}-${String(row.dia).padStart(2, "0")}`

async function cargarEmpleados(numeros: string[]): Promise<Map<string, EmpleadoRow>> {
  const empleados = new Map<string, EmpleadoRow>()
  for (let offset = 0; offset < numeros.length; offset += CHUNK_SIZE) {
    const { data, error } = await supabase
      .from("employees")
      .select("numero, nombre, departamento")
      .in("numero", numeros.slice(offset, offset + CHUNK_SIZE))
    if (error) throw error
    for (const row of (data ?? []) as EmpleadoRow[]) empleados.set(row.numero, row)
  }
  return empleados
}

function agrupar(fechas: string[], rows: RegistroRow[], empleados: Map<string, EmpleadoRow>): RegistrosSemana {
  const porEmpleado = new Map<string, number>()
  for (const row of rows) porEmpleado.set(row.numero_empleado, (porEmpleado.get(row.numero_empleado) ?? 0) + row.cantidad)

  const lista: RegistrosEmpleado[] = [...porEmpleado].map(([numero, cantidad]) => {
    const empleado = empleados.get(numero)
    return {
      numero,
      nombre: empleado?.nombre?.trim() || "—",
      departamento: empleado?.departamento?.trim() || SIN_DEPARTAMENTO,
      cantidad,
    }
  }).sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, "es-MX"))

  const porDepartamento = new Map<string, number>()
  for (const empleado of lista) porDepartamento.set(empleado.departamento, (porDepartamento.get(empleado.departamento) ?? 0) + empleado.cantidad)
  const departamentos = [...porDepartamento]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es-MX"))
    .slice(0, TOP)
    .map(([nombre]) => nombre)

  const departamentoDe = new Map(lista.map(empleado => [empleado.numero, empleado.departamento]))
  const indice = new Map(departamentos.map((nombre, index) => [nombre, index]))
  const dias: RegistrosDia[] = fechas.map(fecha => ({ fecha, valores: departamentos.map(() => 0) }))
  for (const row of rows) {
    const index = indice.get(departamentoDe.get(row.numero_empleado) ?? "")
    const dia = dias.find(item => item.fecha === fechaDe(row))
    if (index === undefined || !dia) continue
    dia.valores[index] += row.cantidad
  }

  return { dias, departamentos, empleados: lista.slice(0, TOP) }
}

/**
 * Registros por empleado y día (retardos, omisiones…) de una semana (lunes "YYYY-MM-DD"),
 * por día y departamento; RLS limita las filas al alcance del usuario.
 */
export function useRegistrosSemana(config: RegistroPorDiaConfig, lunes: string) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<RegistrosSemana | null>(null)
  const requestIdRef = useRef(0)

  const load = useCallback(async () => {
    const request = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const fechas = diasDeSemana(lunes)
      const semana = new Set(fechas)
      const meses = [...new Set(fechas.map(fecha => fecha.slice(0, 7)))]
      const rows = (await fetchAllRows<RegistroRow>((from, to) =>
        supabase
          .from(config.tabla)
          .select("numero_empleado, mes, dia, cantidad")
          .in("mes", meses)
          .order("mes")
          .order("dia")
          .order("numero_empleado")
          .range(from, to),
      )).filter(row => semana.has(fechaDe(row)))
      const empleados = await cargarEmpleados([...new Set(rows.map(row => row.numero_empleado))])
      if (request !== requestIdRef.current) return
      setData(agrupar(fechas, rows, empleados))
    } catch (err) {
      if (request !== requestIdRef.current) return
      setError(describeSupabaseError(err, `No se pudieron cargar ${textosRegistro(config).losPlural}`))
    } finally {
      if (request === requestIdRef.current) setLoading(false)
    }
  }, [config, lunes])

  useEffect(() => {
    void load()
    return () => { requestIdRef.current++ }
  }, [load])

  return { loading, error, data, refresh: load }
}
