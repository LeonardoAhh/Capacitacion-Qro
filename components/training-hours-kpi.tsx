"use client"

import { LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AlertTriangle, BookOpen, Clock, TrendingDown, TrendingUp, Users } from "lucide-react"
import { CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import {
  CHART_LINE_CURSOR, CHART_TOOLTIP_CLASS, chartActiveDot, chartDot, ExpandablePanel, PanelEmpty, PanelError, PanelHeader,
  panelBodyClass, panelChartClass,
} from "@/components/dashboard-panel"
import { useTheme } from "@/components/theme-context"
import { useMediaQuery } from "@/lib/hooks/useMediaQuery"
import { cn } from "@/lib/utils"
import { useTrainingHours, type TrainingHoursYearStat } from "@/lib/hooks/useTrainingHours"

const formatNumber = (value: number) => value.toLocaleString("es-MX", { maximumFractionDigits: 2 })
const monthLabel = (month: number) => new Date(2000, month - 1).toLocaleString("es-MX", { month: "short" }).replace(".", "")

interface TooltipEntry { payload: TrainingHoursYearStat; value: number }

function HoursTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const rows = [
    { icon: Clock, label: "Total horas", value: `${formatNumber(d.totalHours)} h` },
    { icon: Users, label: "Empleados", value: d.uniqueEmployees },
    { icon: TrendingUp, label: "Promedio / emp.", value: `${d.avgHoursPerEmployee} h` },
    { icon: BookOpen, label: "Cursos", value: d.coursesWithDuration },
  ]
  return (
    <div data-testid="hours-kpi-tooltip" className={cn(CHART_TOOLTIP_CLASS, "min-w-52 space-y-1")}>
      <p className="text-label-sm text-foreground">Año {label}</p>
      {rows.map(({ icon: Icon, label: rowLabel, value }) => (
        <p key={rowLabel} className="flex items-center justify-between gap-4 text-muted-foreground">
          <span className="flex items-center gap-1.5"><Icon className="size-3.5" aria-hidden="true" />{rowLabel}</span>
          <span className="text-foreground">{value}</span>
        </p>
      ))}
    </div>
  )
}

function YearRow({ year, previous }: { year: TrainingHoursYearStat; previous: TrainingHoursYearStat | null }) {
  const change = previous && previous.totalHours > 0 ? ((year.totalHours - previous.totalHours) / previous.totalHours) * 100 : null
  const Trend = change !== null && change < 0 ? TrendingDown : TrendingUp
  return (
    <AccordionItem value={year.year} className="border-b-0">
      <AccordionTrigger className="gap-3 px-(--card-padding) hover:no-underline">
        <span data-testid={`hours-kpi-year-${year.year}`} className="flex min-w-0 flex-1 flex-col gap-0.5 text-left @lg:flex-row @lg:items-center @lg:justify-between @lg:gap-4">
          <span className="flex items-center gap-2">
            <span className="text-label-sm tabular-nums text-foreground">{year.year}</span>
            {change !== null && (
              <span className={cn("flex items-center gap-0.5 text-body-sm tabular-nums", change > 0 ? "text-chart-1-deep" : change < 0 ? "text-destructive" : "text-muted-foreground")}>
                {change !== 0 && <Trend className="size-3.5" aria-hidden="true" />}
                {change > 0 ? "+" : ""}{change.toFixed(1)}%
                <span className="sr-only"> frente al año anterior</span>
              </span>
            )}
          </span>
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-body-sm tabular-nums text-muted-foreground">
            <span className="text-label-sm text-foreground">{formatNumber(year.totalHours)} h</span>
            <span>{year.uniqueEmployees} empleados</span>
            <span>{year.coursesWithDuration} cursos</span>
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-(--card-padding)">
        <p className="mb-2 text-body-sm text-muted-foreground">Cursos únicos por mes</p>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {year.months.map(m => (
            <li key={m.month} className="rounded-md border px-3 py-2">
              <p className="text-eyebrow uppercase text-muted-foreground">{monthLabel(m.month)}</p>
              <p className="text-label-sm tabular-nums text-foreground">{m.uniqueCourses}</p>
              {m.inductionCourses > 0 && (
                <p className="truncate text-body-sm tabular-nums text-muted-foreground">{m.inductionCourses} inducción</p>
              )}
            </li>
          ))}
        </ul>
      </AccordionContent>
    </AccordionItem>
  )
}

/** Horas de capacitación: gráfica por año y detalle mensual de cada año. */
export default function TrainingHoursKPI() {
  const { loading, error, years, coursesWithDurationCount, refresh } = useTrainingHours()
  const prefersReduced = useMediaQuery("(prefers-reduced-motion: reduce)")
  const { reducedMotion } = useTheme()
  const skip = prefersReduced || reducedMotion

  const grandTotal = years.reduce((s, y) => s + y.totalHours, 0)
  const hasNoDuration = coursesWithDurationCount === 0
  const periodo = `${years.length} ${years.length === 1 ? "año" : "años"}`

  return (
    <ExpandablePanel label="Horas de capacitación" testId="training-hours-kpi-card">
      {({ expanded, expandButton }) => (
        <>
            <PanelHeader actions={expandButton} />
            <CardContent className={cn("space-y-4", panelBodyClass(expanded))}>
              {loading ? (
                <div role="status" aria-label="Cargando horas de capacitación" className="space-y-4">
                  <span className="sr-only">Cargando horas de capacitación…</span>
                  <Skeleton className="h-56 w-full rounded-xl" />
                </div>
              ) : error ? (
                <PanelError message={error} onRetry={refresh} />
              ) : hasNoDuration || years.length === 0 ? (
                <PanelEmpty
                  icon={hasNoDuration
                    ? <AlertTriangle className="size-6 text-warning-deep" aria-hidden="true" />
                    : <Clock className="size-6 text-muted-foreground" aria-hidden="true" />}
                  title={hasNoDuration ? "Falta capturar la duración de los cursos." : "Sin historial reciente."}
                />
              ) : (
                <>
                  <div
                    data-testid="hours-kpi-chart"
                    role="img"
                    aria-label={`Horas de capacitación en los últimos ${periodo}: ${formatNumber(grandTotal)} horas totales`}
                    className={cn("text-muted-foreground", panelChartClass(expanded, "h-56"))}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={years} margin={{ top: 24, right: 8, left: -8, bottom: 0 }}>
                        <XAxis dataKey="year" tick={{ fill: "currentColor", className: "text-body-sm" }} tickLine={false} axisLine={false} padding={{ left: 24, right: 24 }} />
                        <YAxis tick={{ fill: "currentColor", className: "text-body-sm" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}h`} />
                        <Tooltip content={<HoursTooltip />} cursor={CHART_LINE_CURSOR} />
                        <Line
                          type="monotone"
                          dataKey="totalHours"
                          stroke="hsl(var(--chart-1))"
                          strokeWidth={2}
                          dot={chartDot("hsl(var(--chart-1))")}
                          activeDot={chartActiveDot("hsl(var(--chart-1))")}
                          isAnimationActive={!skip}
                        >
                          <LabelList dataKey="totalHours" position="top" offset={10} className="fill-foreground text-label-sm" formatter={(v: unknown) => `${v} h`} />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <Accordion type="single" collapsible data-testid="hours-kpi-year-list" className="@container divide-y overflow-hidden rounded-xl border">
                    {years.map((year, index) => <YearRow key={year.year} year={year} previous={index > 0 ? years[index - 1] : null} />)}
                  </Accordion>
                </>
              )}
            </CardContent>
        </>
      )}
    </ExpandablePanel>
  )
}
