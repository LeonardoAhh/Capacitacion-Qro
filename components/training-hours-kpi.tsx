"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList,
} from "recharts"
import { AlertTriangle, BookOpen, Clock, Info, TrendingDown, TrendingUp, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Tooltip as TooltipUI, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { PanelHeader } from "@/components/dashboard-panel"
import { cn } from "@/lib/utils"
import { useTrainingHours, type TrainingHoursYearStat } from "@/lib/hooks/useTrainingHours"

const HORAS_HOMBRE = "Horas-hombre: la duración de cada curso multiplicada por la cantidad de empleados que lo tomaron."
const formatNumber = (value: number) => value.toLocaleString("es-MX", { maximumFractionDigits: 2 })
const monthLabel = (month: number) => new Date(2000, month - 1).toLocaleString("es-MX", { month: "short" }).replace(".", "")

// ─── Tooltip de la gráfica ───────────────────────────────────────────────────

interface TooltipEntry { payload: TrainingHoursYearStat; value: number }

function HoursTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const rows = [
    { icon: Clock, label: "Total horas", value: formatNumber(d.totalHours) },
    { icon: Users, label: "Empleados", value: d.uniqueEmployees },
    { icon: TrendingUp, label: "Promedio por empleado", value: `${d.avgHoursPerEmployee} h` },
    { icon: BookOpen, label: "Cursos contabilizados", value: d.coursesWithDuration },
  ]
  return (
    <div data-testid="hours-kpi-tooltip" className="min-w-52 space-y-1 rounded-md border bg-popover p-3 shadow-[var(--floating-shadow)]">
      <p className="text-label-sm text-foreground">Año {label}</p>
      {rows.map(({ icon: Icon, label: rowLabel, value }) => (
        <p key={rowLabel} className="flex items-center justify-between gap-4 text-body-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><Icon className="size-3.5" aria-hidden="true" />{rowLabel}</span>
          <span className="tabular-nums text-foreground">{value}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Resumen ─────────────────────────────────────────────────────────────────

function Summary({ items }: { items: { label: string; value: string; hint?: string; testId: string }[] }) {
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-xl border">
      {items.map(({ label, value, hint, testId }, index) => (
        <div key={label} data-testid={testId}
          className={cn("min-w-0 space-y-1 p-(--card-padding)", index % 2 === 1 && "border-l", index >= 2 && "border-t")}>
          <dt className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
            <span className="truncate">{label}</span>
            {hint && (
              <TooltipUI delayDuration={300}>
                <TooltipTrigger asChild>
                  <button type="button" aria-label={`Qué incluye: ${label}`} className="shrink-0 rounded-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    <Info className="size-3.5" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-64">{hint}</TooltipContent>
              </TooltipUI>
            )}
          </dt>
          <dd className="text-heading-lg tabular-nums text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

// ─── Detalle por año ─────────────────────────────────────────────────────────

function YearRow({ year, previous }: { year: TrainingHoursYearStat; previous: TrainingHoursYearStat | null }) {
  const change = previous && previous.totalHours > 0 ? ((year.totalHours - previous.totalHours) / previous.totalHours) * 100 : null
  const Trend = change !== null && change < 0 ? TrendingDown : TrendingUp
  return (
    <AccordionItem value={year.year} className="border-b-0">
      <AccordionTrigger className="gap-3 px-(--card-padding) hover:no-underline">
        <span data-testid={`hours-kpi-year-${year.year}`} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-left">
          <span className="flex items-center gap-2">
            <span className="text-label-sm tabular-nums text-foreground">{year.year}</span>
            {change !== null && (
              <span className={cn("flex items-center gap-0.5 text-body-sm tabular-nums", change > 0 ? "text-success" : change < 0 ? "text-destructive" : "text-muted-foreground")}>
                {change !== 0 && <Trend className="size-3.5" aria-hidden="true" />}
                {change > 0 ? "+" : ""}{change.toFixed(1)}%
                <span className="sr-only"> frente al año anterior</span>
              </span>
            )}
          </span>
          <span className="text-body-sm text-muted-foreground">
            {formatNumber(year.totalHours)} h · {year.uniqueEmployees} empleados · {year.coursesWithDuration} cursos · {year.avgHoursPerEmployee} h por empleado
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-(--card-padding)">
        <p className="mb-2 text-body-sm text-muted-foreground">Cursos contabilizados por mes</p>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {year.months.map(m => (
            <li key={m.month} className="rounded-md border px-3 py-2">
              <p className="text-eyebrow uppercase text-muted-foreground">{monthLabel(m.month)}</p>
              <p className="text-label-sm tabular-nums text-foreground">{m.uniqueCourses} cursos</p>
              {m.inductionCourses > 0 && <p className="truncate text-body-sm text-muted-foreground">{m.inductionCourses} de inducción</p>}
            </li>
          ))}
        </ul>
      </AccordionContent>
    </AccordionItem>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

/** Horas de capacitación: resumen, gráfica por año y detalle mensual de cada año. */
export default function TrainingHoursKPI() {
  const { loading, years, coursesWithDurationCount } = useTrainingHours()

  const grandTotal = years.reduce((s, y) => s + y.totalHours, 0)
  const totalTakings = years.reduce((s, y) => s + y.coursesWithDuration, 0)
  const globalAvg = years.length > 0
    ? Math.round((years.reduce((s, y) => s + y.avgHoursPerEmployee, 0) / years.length) * 100) / 100
    : 0
  const hasNoDuration = coursesWithDurationCount === 0
  const currentYear = String(new Date().getFullYear())
  const currentYearData = years.find(y => y.year === currentYear)
  const periodo = `${years.length} ${years.length === 1 ? "año" : "años"}`

  return (
    <Card data-testid="training-hours-kpi-card">
      <PanelHeader description={`Horas-hombre de los últimos ${periodo}`} />
      <CardContent className="space-y-4 p-(--card-padding) pt-0">
        {loading ? (
          <div className="space-y-4" aria-label="Cargando horas de capacitación">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        ) : hasNoDuration || years.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-(--card-padding) py-12 text-center">
            {hasNoDuration
              ? <AlertTriangle className="size-6 text-warning-deep" aria-hidden="true" />
              : <Clock className="size-6 text-muted-foreground" aria-hidden="true" />}
            <p className="text-body-md text-muted-foreground">
              {hasNoDuration ? "Falta capturar la duración de los cursos." : "No hay historial reciente."}
            </p>
          </div>
        ) : (
          <TooltipProvider>
            {/* Resumen (2 × 2) y gráfica lado a lado en pantallas anchas. */}
            <div className="grid items-center gap-4 lg:grid-cols-2">
            <Summary items={[
              { testId: "hours-kpi-current", label: currentYearData ? `Horas en ${currentYear}` : "Horas en el año", value: formatNumber(currentYearData?.totalHours ?? 0), hint: HORAS_HOMBRE },
              { testId: "hours-kpi-total", label: `Horas totales (${periodo})`, value: formatNumber(grandTotal), hint: HORAS_HOMBRE },
              { testId: "hours-kpi-avg", label: "Promedio por empleado", value: `${formatNumber(globalAvg)} h` },
              { testId: "hours-kpi-takings", label: "Cursos contabilizados", value: totalTakings.toLocaleString("es-MX") },
            ]} />

            <div data-testid="hours-kpi-chart" className="text-muted-foreground">
              <ResponsiveContainer width="100%" height={Math.max(200, years.length * 56)}>
                <BarChart data={years} layout="vertical" margin={{ top: 4, right: 60, left: 0, bottom: 4 }} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted-foreground/15" />
                  <XAxis type="number" tick={{ fill: "currentColor", className: "text-body-sm" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}h`} />
                  <YAxis type="category" dataKey="year" tick={{ fill: "hsl(var(--foreground))", className: "text-label-sm" }} tickLine={false} axisLine={false} width={56} />
                  <Tooltip content={<HoursTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                  <Bar dataKey="totalHours" radius={[0, 6, 6, 0]} fill="hsl(var(--primary))">
                    <LabelList dataKey="totalHours" position="right" className="text-label-sm" fill="hsl(var(--foreground))" formatter={(v: unknown) => `${v} h`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            </div>

            <Accordion type="single" collapsible data-testid="hours-kpi-year-list" className="divide-y overflow-hidden rounded-xl border">
              {years.map((year, index) => <YearRow key={year.year} year={year} previous={index > 0 ? years[index - 1] : null} />)}
            </Accordion>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  )
}
