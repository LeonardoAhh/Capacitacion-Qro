"use client"

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import { GraduationCap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { CHART_TOOLTIP_CLASS, PanelEmpty, PanelError, PanelHeader } from "@/components/dashboard-panel"
import { useTheme } from "@/components/theme-context"
import { useMediaQuery } from "@/lib/hooks/useMediaQuery"
import {
  useCapacitacionChart,
  YEARS,
  COLORS_CHART as COLORS,
} from "@/lib/hooks/useCapacitacionChart"

interface TooltipEntry {
  dataKey: string
  value: number
  color: string
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null
  const dataPoints = payload.filter((p) => !p.dataKey.includes("_trend"))
  return (
    <div className={CHART_TOOLTIP_CLASS}>
      <p className="mb-1.5 text-label-sm text-foreground">{label}</p>
      <div className="space-y-1">
        {dataPoints.map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 shrink-0 rounded-sm" style={{ background: p.color }} aria-hidden="true" />
              {p.dataKey}
            </span>
            <span className="font-medium text-foreground">
              {p.value} {p.value === 1 ? "curso" : "cursos"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SkeletonContent() {
  return (
    <div role="status" aria-label="Cargando cursos impartidos" className="space-y-3">
      <span className="sr-only">Cargando cursos impartidos…</span>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

export default function CapacitacionChart() {
  const {
    loading, error, departments, selectedDept, setSelectedDept,
    chartData, yearTotals, refresh,
  } = useCapacitacionChart()

  const prefersReduced = useMediaQuery("(prefers-reduced-motion: reduce)")
  const { reducedMotion } = useTheme()
  const skip = prefersReduced || reducedMotion

  const isEmpty = chartData.every(
    p => p["2024"] === 0 && p["2025"] === 0 && p["2026"] === 0
  )

  return (
    <Card>
      <PanelHeader
        description="Cursos únicos por mes"
        stats={!loading && !error && !isEmpty ? yearTotals.map(({ year, total }) => ({ color: COLORS[year], label: year, value: total })) : undefined}
        actions={
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger aria-label="Filtrar por departamento" className="w-full sm:w-auto">
              <SelectValue placeholder="Todos los departamentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los departamentos</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <CardContent className="p-(--card-padding) pt-0">
        {loading ? (
          <SkeletonContent />
        ) : error ? (
          <PanelError message={error} onRetry={refresh} />
        ) : isEmpty ? (
          <PanelEmpty
            icon={<GraduationCap className="size-6 text-muted-foreground" aria-hidden="true" />}
            title="Sin historial de cursos."
          />
        ) : (
          <div role="img" aria-label="Cursos únicos impartidos por mes y año" className="h-75 dense:h-56">
            <ResponsiveContainer className="text-body-sm" width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/15" vertical={false} />
                <XAxis dataKey="month" className="text-muted-foreground" axisLine={false} tickLine={false} />
                <YAxis className="text-muted-foreground" axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 8 }}
                  content={() => (
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-body-sm text-muted-foreground">
                      {YEARS.map(year => (
                        <span key={year} className="flex items-center gap-1.5 tabular-nums">
                          <span className="h-0.5 w-3 shrink-0" style={{ background: COLORS[year] }} aria-hidden="true" />
                          {year}
                        </span>
                      ))}
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 shrink-0 border-t border-dashed border-muted-foreground" aria-hidden="true" />
                        Tendencia
                      </span>
                    </div>
                  )}
                />

                {YEARS.map(year => (
                  <Line
                    key={year}
                    type="monotone"
                    dataKey={year}
                    stroke={COLORS[year]}
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: COLORS[year], strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                    connectNulls
                    isAnimationActive={!skip}
                    animationDuration={skip ? 0 : 700}
                    animationEasing="ease-in-out"
                  />
                ))}

                {YEARS.map(year => (
                  <Line
                    key={`${year}_trend`}
                    type="linear"
                    dataKey={`${year}_trend`}
                    stroke={COLORS[year]}
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    dot={false}
                    activeDot={false}
                    legendType="none"
                    isAnimationActive={!skip}
                    animationDuration={skip ? 0 : 900}
                    animationEasing="ease-in-out"
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
