"use client"

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { GraduationCap } from "lucide-react"
import { CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CHART_LINE_CURSOR, CHART_TOOLTIP_CLASS, chartActiveDot, chartDot, DepartmentPager, ExpandablePanel, PanelEmpty, PanelError, PanelHeader,
  PanelLegend, panelBodyClass, panelChartClass,
} from "@/components/dashboard-panel"
import { useTheme } from "@/components/theme-context"
import { useMediaQuery } from "@/lib/hooks/useMediaQuery"
import { cn } from "@/lib/utils"
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

function SkeletonContent({ className }: { className: string }) {
  return (
    <div role="status" aria-label="Cargando cursos impartidos" className={className}>
      <span className="sr-only">Cargando cursos impartidos…</span>
      <Skeleton className="h-full w-full rounded-xl" />
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

  const legend = [
    ...YEARS.map(year => ({ label: year, color: COLORS[year] })),
    { label: "Tendencia", color: "hsl(var(--muted-foreground))", outline: true },
  ]

  return (
    <ExpandablePanel label="Cursos impartidos">
      {({ expanded, expandButton }) => (
        <>
          <PanelHeader
            stats={!loading && !error && !isEmpty ? yearTotals.map(({ year, total }) => ({ color: COLORS[year], label: year, value: total })) : undefined}
            actions={<>
              <DepartmentPager departments={departments} value={selectedDept} onChange={setSelectedDept} />
              {expandButton}
            </>}
          />

          <CardContent className={cn("space-y-4", panelBodyClass(expanded))}>
            {loading ? (
              <SkeletonContent className={panelChartClass(expanded, "h-64")} />
            ) : error ? (
              <PanelError message={error} onRetry={refresh} />
            ) : isEmpty ? (
              <PanelEmpty
                icon={<GraduationCap className="size-6 text-muted-foreground" aria-hidden="true" />}
                title="Sin historial de cursos."
              />
            ) : (
              <>
                <div role="img" aria-label="Cursos únicos impartidos por mes y año" className={cn("text-muted-foreground", panelChartClass(expanded, "h-75 dense:h-56"))}>
                  <ResponsiveContainer className="text-body-sm" width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                      <XAxis dataKey="month" tick={{ fill: "currentColor" }} axisLine={false} tickLine={false} padding={{ left: 16, right: 16 }} />
                      <YAxis tick={{ fill: "currentColor" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} cursor={CHART_LINE_CURSOR} />

                      {YEARS.map(year => (
                        <Line
                          key={year}
                          type="monotone"
                          dataKey={year}
                          stroke={COLORS[year]}
                          strokeWidth={2}
                          dot={chartDot(COLORS[year])}
                          activeDot={chartActiveDot(COLORS[year])}
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
                <PanelLegend items={legend} />
              </>
            )}
          </CardContent>
        </>
      )}
    </ExpandablePanel>
  )
}
