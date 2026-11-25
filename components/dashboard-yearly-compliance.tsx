"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CHART_TOOLTIP_CLASS, PanelEmpty, PanelError, PanelHeader } from "@/components/dashboard-panel"
import { useTheme } from "@/components/theme-context"
import { useMediaQuery } from "@/lib/hooks/useMediaQuery"
import {
  useYearlyCompliance, COLORS_YEARLY as COLORS, type YearStats,
} from "@/lib/hooks/useYearlyCompliance"
import { cn } from "@/lib/utils"

interface TooltipEntry { dataKey: string; value: number; color: string }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null
  const row = (payload[0] as unknown as { payload: YearStats }).payload
  return (
    <div className={CHART_TOOLTIP_CLASS}>
      <p className="mb-1.5 text-label-sm text-foreground">{label}</p>
      <div className="space-y-1 text-muted-foreground">
        {[
          { label: "Aprobados", value: row.aprobados, color: COLORS.aprobado, cls: "text-chart-1-deep" },
          { label: "Reprobados", value: row.reprobados, color: COLORS.reprobado, cls: "text-destructive" },
          { label: "Pendientes", value: row.pendientes, color: COLORS.pendiente, cls: "text-warning-deep" },
        ].map(r => (
          <div key={r.label} className="flex justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-sm" style={{ background: r.color }} aria-hidden="true" />
              {r.label}
            </span>
            <span className={cn("font-bold", r.cls)}>{r.value}</span>
          </div>
        ))}
        <div className="mt-1 flex justify-between gap-4 border-t pt-1">
          <span>Cumplimiento</span>
          <span className="font-bold text-chart-1-deep">{row.pct}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Empleados</span>
          <span className="font-medium text-foreground">{row.empleados}</span>
        </div>
      </div>
    </div>
  )
}

function SkeletonContent() {
  return (
    <div role="status" aria-label="Cargando cumplimiento por año de ingreso" className="space-y-4">
      <span className="sr-only">Cargando cumplimiento por año de ingreso…</span>
      {[65, 82, 48].map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-12 shrink-0" />
          <Skeleton className="h-6 rounded-sm" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  )
}

export default function DashboardYearlyCompliance() {
  const { loading, error, yearStats, cargar } = useYearlyCompliance()

  const prefersReduced = useMediaQuery("(prefers-reduced-motion: reduce)")
  const { reducedMotion } = useTheme()
  const skip = prefersReduced || reducedMotion

  const isEmpty = yearStats.every(s => s.asignados === 0)
  const totalEmpleados = yearStats.reduce((s, y) => s + y.empleados, 0)
  const totalAprobados = yearStats.reduce((s, y) => s + y.aprobados, 0)
  const totalAsignados = yearStats.reduce((s, y) => s + y.asignados, 0)
  const pctGlobal = totalAsignados > 0 ? Math.round((totalAprobados / totalAsignados) * 100) : 0

  const kpiBadges = [
    { color: "hsl(var(--primary))", label: "Empleados", value: totalEmpleados },
    { color: COLORS.aprobado, label: "Aprobados", value: totalAprobados },
    { color: COLORS.aprobado, label: "Global", value: `${pctGlobal}%` },
  ]

  return (
    <Card>
      <PanelHeader
        description="Avance en cursos por año de ingreso"
        stats={!loading && !error && !isEmpty ? kpiBadges : undefined}
      />

      <CardContent className="p-(--card-padding) pt-0">
        {loading ? (
          <SkeletonContent />
        ) : error ? (
          <PanelError message={error} onRetry={() => void cargar()} />
        ) : isEmpty ? (
          <PanelEmpty
            icon={<TrendingUp className="size-6 text-muted-foreground" aria-hidden="true" />}
            title="Sin datos por año de ingreso."
          />
        ) : (
          <div className="space-y-5">
            <div role="img" aria-label={`Cumplimiento por año de ingreso: ${pctGlobal}% global`}>
              <ResponsiveContainer className="text-body-sm" width="100%" height={220}>
                <BarChart data={yearStats} layout="vertical" margin={{ top: 0, right: 16, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/15" horizontal={false} />
                  <XAxis type="number" className="text-muted-foreground" axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="year" tick={{ fontWeight: 700 }} className="text-muted-foreground" axisLine={false} tickLine={false} width={55} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
                  <Legend
                    wrapperStyle={{ paddingTop: 8 }}
                    formatter={(v: string) => (
                      <span className="text-muted-foreground">
                        {v === "aprobados" ? "Aprobados" : v === "reprobados" ? "Reprobados" : "Pendientes"}
                      </span>
                    )}
                  />
                  <Bar dataKey="aprobados" stackId="a" fill={COLORS.aprobado} isAnimationActive={!skip} animationDuration={skip ? 0 : 600} />
                  <Bar dataKey="reprobados" stackId="a" fill={COLORS.reprobado} isAnimationActive={!skip} animationDuration={skip ? 0 : 600} />
                  <Bar dataKey="pendientes" stackId="a" fill={COLORS.pendiente} radius={[0, 4, 4, 0]} isAnimationActive={!skip} animationDuration={skip ? 0 : 600} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {yearStats.map((s) => (
                <div key={s.year} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-body-sm tabular-nums">
                    <span className="text-label-sm text-foreground">{s.year}</span>
                    <span className="text-muted-foreground">
                      {s.aprobados}/{s.asignados} cursos
                      <span className="ml-2 font-bold text-chart-1-deep">{s.pct}%</span>
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`Cumplimiento ${s.year}`}
                    aria-valuenow={s.pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-2 overflow-hidden rounded-sm bg-muted"
                  >
                    <div
                      className="h-full rounded-sm transition-[width] duration-300 motion-reduce:transition-none"
                      style={{ width: `${s.pct}%`, background: COLORS.aprobado }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
