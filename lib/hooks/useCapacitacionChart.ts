"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import { describeSupabaseError } from "@/lib/supabase/errors"
import { fetchAllRows } from "@/lib/supabase/fetchAll"
import { ALL_DEPARTMENTS } from "@/lib/constants/filters"

export interface MonthlyPoint {
  month: string
  "2024": number; "2024_trend": number
  "2025": number; "2025_trend": number
  "2026": number; "2026_trend": number
}

interface Department { id: string; name: string }

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
export const YEARS = ["2024", "2025", "2026"] as const
const CHART_START_DATE = `${YEARS[0]}-01-01`
const CHART_END_DATE = `${Number(YEARS[YEARS.length - 1]) + 1}-01-01`

export const COLORS_CHART: Record<string, string> = {
  "2024": "hsl(var(--chart-3))",
  "2025": "hsl(var(--chart-5))",
  "2026": "hsl(var(--chart-1))",
}

function linearTrend(values: number[]): number[] {
  const n = values.length
  const xs = values.map((_, i) => i)
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = values.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((s, x, i) => s + x * values[i], 0)
  const sumX2 = xs.reduce((s, x) => s + x * x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return xs.map(x => Math.max(0, Math.round((slope * x + intercept) * 10) / 10))
}

/** Cada curso guarda el departamento del empleado: cuenta aunque el empleado ya se haya borrado. */
interface CourseRow { course_id: string | null; raw_course_name: string; fecha_aplicacion: string | null; departamento_empleado: string | null }

const normalizeDept = (value: string | null | undefined) => (value ?? "").trim().toLocaleLowerCase("es-MX")

/** Cursos únicos por mes y año, con su tendencia lineal. */
function buildChart(rows: CourseRow[]): { points: MonthlyPoint[]; totals: { year: string; total: number }[] } {
  const grid: Record<string, Record<number, Set<string>>> = {}
  for (const y of YEARS) {
    grid[y] = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i, new Set<string>()]))
  }

  for (const r of rows) {
    if (!r.fecha_aplicacion) continue
    const parts = r.fecha_aplicacion.split("-")
    if (parts.length !== 3) continue
    const year = parts[0]
    const month = parseInt(parts[1], 10) - 1
    if (!grid[year] || month < 0 || month > 11) continue
    grid[year][month].add(r.course_id ?? r.raw_course_name.trim().toUpperCase())
  }

  const rawValues: Record<string, number[]> = {}
  for (const y of YEARS) rawValues[y] = MONTHS.map((_, i) => grid[y][i].size)

  const trends: Record<string, number[]> = {}
  for (const y of YEARS) trends[y] = linearTrend(rawValues[y])

  return {
    points: MONTHS.map((label, i) => ({
      month: label,
      "2024": rawValues["2024"][i], "2024_trend": trends["2024"][i],
      "2025": rawValues["2025"][i], "2025_trend": trends["2025"][i],
      "2026": rawValues["2026"][i], "2026_trend": trends["2026"][i],
    })),
    totals: YEARS.map(y => ({ year: y, total: rawValues[y].reduce((s, v) => s + v, 0) })),
  }
}

/**
 * Carga una vez los cursos del periodo (con el departamento de quien lo tomó);
 * cambiar de departamento filtra en memoria, sin volver a consultar.
 */
export function useCapacitacionChart() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDept, setSelectedDept] = useState<string>(ALL_DEPARTMENTS)
  const [rows, setRows] = useState<CourseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const loadData = useCallback(async () => {
    const currentRequest = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const [deptResult, courseRows] = await Promise.all([
        supabase.from("departments").select("id, name").order("name"),
        fetchAllRows<CourseRow>((from, to) =>
          supabase
            .from("employee_courses")
            .select("course_id, raw_course_name, fecha_aplicacion, departamento_empleado")
            .not("fecha_aplicacion", "is", null)
            .gte("fecha_aplicacion", CHART_START_DATE)
            .lt("fecha_aplicacion", CHART_END_DATE)
            .range(from, to),
        ),
      ])
      if (deptResult.error) throw deptResult.error
      if (currentRequest !== requestIdRef.current) return
      setDepartments(deptResult.data ?? [])
      setRows(courseRows)
    } catch (err) {
      if (currentRequest !== requestIdRef.current) return
      console.error("Chart error:", err instanceof Error ? err.message : JSON.stringify(err))
      setError(describeSupabaseError(err, "No se pudieron cargar los cursos impartidos"))
    } finally {
      if (currentRequest === requestIdRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
    return () => { requestIdRef.current++ }
  }, [loadData])

  const { points: chartData, totals: yearTotals } = useMemo(() => {
    if (selectedDept === ALL_DEPARTMENTS) return buildChart(rows)
    const deptName = normalizeDept(departments.find(d => d.id === selectedDept)?.name)
    return buildChart(rows.filter(r => normalizeDept(r.departamento_empleado) === deptName))
  }, [rows, departments, selectedDept])

  return {
    loading, error, departments, selectedDept, setSelectedDept,
    chartData, yearTotals,
    refresh: () => void loadData(),
  }
}
