"use client"

import { useState } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList, ReferenceLine,
} from "recharts"
import { GraduationCap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CHART_TOOLTIP_CLASS, PanelEmpty, PanelError, PanelHeader, PanelStats } from "@/components/dashboard-panel"
import { useCumplimientoShared } from "@/components/dashboard-cumplimiento-context"
import { useTheme } from "@/components/theme-context"
import { useMediaQuery } from "@/lib/hooks/useMediaQuery"
import {
  colorPct, textColorPct, META,
  COLORS_CUMPLIMIENTO as COLORS, type DeptCumplimiento,
} from "@/lib/hooks/useCumplimiento"
import { cn } from "@/lib/utils"

interface BarTooltipEntry { payload: DeptCumplimiento }

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: BarTooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className={CHART_TOOLTIP_CLASS}>
      <p className="mb-1.5 truncate text-label-sm text-foreground">{label}</p>
      <div className="space-y-1 text-muted-foreground">
        {[
          { label: "Aprobados", value: d.aprobados, color: COLORS.aprobado, cls: "text-chart-1-deep" },
          { label: "Reprobados", value: d.reprobados, color: COLORS.reprobado, cls: "text-destructive" },
          { label: "Pendientes", value: d.pendientes, color: COLORS.pendiente, cls: "text-warning-deep" },
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
          <span className={cn("font-bold", textColorPct(d.pct))}>{d.pct}%</span>
        </div>
      </div>
    </div>
  )
}

function SkeletonContent() {
  return (
    <div role="status" aria-label="Cargando cumplimiento" className="space-y-3">
      <span className="sr-only">Cargando cumplimiento…</span>
      {[78, 55, 90, 42, 68].map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-3.5 w-24 shrink-0" />
          <Skeleton className="h-5 rounded-sm" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  )
}

export default function DashboardCumplimiento() {
  const {
    loading, error, departments, deptData,
    totalAsignados, totalAprobados, totalReprobados, totalPendientes,
    totalEmpleados, totalEmpleadosConPuesto, cargar,
  } = useCumplimientoShared()

  const prefersReduced = useMediaQuery("(prefers-reduced-motion: reduce)")
  const { reducedMotion } = useTheme()
  const skip = prefersReduced || reducedMotion

  const [deptFilter, setDeptFilter] = useState<string>("all")

  const filteredDeptData = deptFilter === "all"
    ? deptData
    : deptData.filter(d => d.departamento.toLowerCase() === deptFilter.toLowerCase())

  const fAsignados = deptFilter === "all" ? totalAsignados : filteredDeptData.reduce((s, d) => s + d.asignados, 0)
  const fAprobados = deptFilter === "all" ? totalAprobados : filteredDeptData.reduce((s, d) => s + d.aprobados, 0)
  const fReprobados = deptFilter === "all" ? totalReprobados : filteredDeptData.reduce((s, d) => s + d.reprobados, 0)
  const fPendientes = deptFilter === "all" ? totalPendientes : filteredDeptData.reduce((s, d) => s + d.pendientes, 0)
  const pctGeneral = fAsignados > 0 ? Math.round((fAprobados / fAsignados) * 100) : 0

  const isEmpty = fAsignados === 0
  const abrevDept = (n: string) => n.length <= 14 ? n : n.substring(0, 13) + "…"

  const stats = [
    { color: colorPct(pctGeneral), label: "Cumplimiento", value: `${pctGeneral}%` },
    { color: COLORS.aprobado, label: "Aprobados", value: `${fAprobados}/${fAsignados}` },
    { color: COLORS.reprobado, label: "Reprobados", value: fReprobados },
    { color: COLORS.pendiente, label: "Pendientes", value: fPendientes },
  ]
  const descripcion = deptFilter === "all"
    ? `Avance por puesto (${totalEmpleadosConPuesto} de ${totalEmpleados} empleados)`
    : "Avance por puesto"

  return (
    <Card>
      <PanelHeader
        description={descripcion}
        actions={
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger aria-label="Filtrar por departamento" className="w-full sm:w-auto">
              <SelectValue placeholder="Todos los departamentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los departamentos</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        {!loading && !error && !isEmpty && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <PanelStats items={stats} />
            <Badge variant={pctGeneral >= META ? "success" : "destructive"} size="sm">
              {pctGeneral >= META ? "Cumple" : "Bajo meta"} · {META}%
            </Badge>
          </div>
        )}
      </PanelHeader>

      <CardContent className="p-(--card-padding) pt-0">
        {loading ? (
          <SkeletonContent />
        ) : error ? (
          <PanelError message={error} onRetry={() => void cargar()} />
        ) : isEmpty ? (
          <PanelEmpty
            icon={<GraduationCap className="size-6 text-muted-foreground" aria-hidden="true" />}
            title="Sin datos de capacitación."
            hint="Configura puestos y cursos requeridos en Capacitación."
          />
        ) : filteredDeptData.length > 0 && (
          <div
            className="w-full overflow-x-auto"
            role="img"
            aria-label={`Cumplimiento por departamento: ${pctGeneral}% en ${filteredDeptData.length} departamentos`}
          >
            <ResponsiveContainer className="text-body-sm" width="100%" height={filteredDeptData.length * 48 + 40} minHeight={160}>
              <BarChart data={filteredDeptData} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted-foreground/15" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  tick={{ fill: "currentColor" }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  ticks={[0, 25, 50, 80, 100]}
                />
                <YAxis
                  type="category"
                  dataKey="departamento"
                  width={120}
                  tick={{ fill: "currentColor" }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={abrevDept}
                />
                <ReferenceLine x={META} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                <Tooltip content={<BarTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                <Bar
                  dataKey="pct"
                  radius={[0, 4, 4, 0]}
                  background={{ fill: "hsl(var(--muted) / 0.2)", radius: 4 }}
                  isAnimationActive={!skip}
                  animationDuration={skip ? 0 : 600}
                  animationEasing="ease-out"
                >
                  {filteredDeptData.map((e, i) => <Cell key={i} fill={colorPct(e.pct)} />)}
                  <LabelList dataKey="pct" position="right" formatter={(v: unknown) => `${v}%`} style={{ fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
