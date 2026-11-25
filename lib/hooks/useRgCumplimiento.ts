"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import { describeSupabaseError } from "@/lib/supabase/errors"

interface RegistroRaw {
  fecha_vencimiento_rg: string | null
  departamento: string | null
  rg_rec_048: string
}

export interface DeptDataRg {
  departamento: string
  total: number
  entregados: number
  pct: number
}

export const META_RG = 70

export type QuarterId = "Q1" | "Q2" | "Q3" | "Q4"

export const QUARTERS = [
  { id: "Q1" as const, label: "Ene-Mar", meses: [0, 1, 2] },
  { id: "Q2" as const, label: "Abr-Jun", meses: [3, 4, 5] },
  { id: "Q3" as const, label: "Jul-Sep", meses: [6, 7, 8] },
  { id: "Q4" as const, label: "Oct-Dic", meses: [9, 10, 11] },
] as const

export function currentQuarter(): QuarterId {
  const mes = new Date().getMonth()
  if (mes <= 2) return "Q1"
  if (mes <= 5) return "Q2"
  if (mes <= 8) return "Q3"
  return "Q4"
}

export function currentYear(): string {
  return String(new Date().getFullYear())
}

export function colorPctRg(pct: number): string {
  if (pct >= META_RG) return "hsl(var(--chart-1))"
  return "hsl(var(--destructive))"
}

export function useRgCumplimiento() {
  const [registros, setRegistros] = useState<RegistroRaw[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quarter, setQuarter] = useState<QuarterId>(currentQuarter())
  const [año, setAño] = useState(currentYear())
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
    try {
      const { data, error: queryError } = await supabase
        .from("nuevo_ingreso")
        .select("fecha_vencimiento_rg, departamento, rg_rec_048")
        .not("fecha_vencimiento_rg", "is", null)
      if (queryError) throw queryError
      if (!mountedRef.current || currentRequest !== requestIdRef.current) return
      setRegistros((data ?? []) as RegistroRaw[])
    } catch (err) {
      if (!mountedRef.current || currentRequest !== requestIdRef.current) return
      console.error("RG cumplimiento error:", err instanceof Error ? err.message : JSON.stringify(err))
      setError(describeSupabaseError(err, "No se pudo cargar el cumplimiento de RG-REC-048"))
    } finally {
      if (mountedRef.current && currentRequest === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => { void cargar() }, [cargar])

  const añoNum = parseInt(año, 10)
  const mesesQ: readonly number[] = QUARTERS.find((q) => q.id === quarter)!.meses

  const filtrados = registros.filter((r) => {
    if (!r.fecha_vencimiento_rg) return false
    const d = new Date(r.fecha_vencimiento_rg + "T00:00:00")
    return d.getFullYear() === añoNum && mesesQ.includes(d.getMonth())
  })

  const deptMap = new Map<string, { total: number; entregados: number }>()
  for (const r of filtrados) {
    const dept = r.departamento ?? "Sin departamento"
    if (!deptMap.has(dept)) deptMap.set(dept, { total: 0, entregados: 0 })
    const entry = deptMap.get(dept)!
    entry.total++
    if (r.rg_rec_048 === "Entregado") entry.entregados++
  }

  const chartData: DeptDataRg[] = Array.from(deptMap.entries())
    .map(([departamento, { total, entregados }]) => ({
      departamento, total, entregados,
      pct: total > 0 ? Math.round((entregados / total) * 100) : 0,
    }))
    .filter((d) => d.total > 0)
    .sort((a, b) => b.pct - a.pct)

  const totalGeneral = filtrados.length
  const entregadosGeneral = filtrados.filter((r) => r.rg_rec_048 === "Entregado").length
  const pctGeneral = totalGeneral > 0 ? Math.round((entregadosGeneral / totalGeneral) * 100) : 0

  const añosDisponibles = Array.from(
    new Set(registros.map((r) => r.fecha_vencimiento_rg?.split("-")[0]).filter(Boolean))
  ).sort((a, b) => Number(b) - Number(a)) as string[]
  if (!añosDisponibles.includes(año)) añosDisponibles.unshift(año)

  return {
    loading, error, quarter, setQuarter, año, setAño,
    chartData, totalGeneral, entregadosGeneral, pctGeneral,
    añosDisponibles, cargar,
  }
}
