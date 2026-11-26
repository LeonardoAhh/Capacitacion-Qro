"use client"

import { useState } from "react"
import { GraduationCap } from "lucide-react"
import { CardContent } from "@/components/ui/card"
import { DeptPctLineChart } from "@/components/dept-pct-line-chart"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { CHART_TOOLTIP_CLASS, DepartmentPager, ExpandablePanel, PanelEmpty, PanelError, PanelHeader, PanelStats, panelBodyClass } from "@/components/dashboard-panel"
import { ALL_DEPARTMENTS } from "@/lib/constants/filters"
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
    cargar,
  } = useCumplimientoShared()

  const prefersReduced = useMediaQuery("(prefers-reduced-motion: reduce)")
  const { reducedMotion } = useTheme()
  const skip = prefersReduced || reducedMotion

  const [deptFilter, setDeptFilter] = useState<string>(ALL_DEPARTMENTS)

  const filteredDeptData = deptFilter === ALL_DEPARTMENTS
    ? deptData
    : deptData.filter(d => d.departamento.toLowerCase() === deptFilter.toLowerCase())

  const fAsignados = deptFilter === ALL_DEPARTMENTS ? totalAsignados : filteredDeptData.reduce((s, d) => s + d.asignados, 0)
  const fAprobados = deptFilter === ALL_DEPARTMENTS ? totalAprobados : filteredDeptData.reduce((s, d) => s + d.aprobados, 0)
  const fReprobados = deptFilter === ALL_DEPARTMENTS ? totalReprobados : filteredDeptData.reduce((s, d) => s + d.reprobados, 0)
  const fPendientes = deptFilter === ALL_DEPARTMENTS ? totalPendientes : filteredDeptData.reduce((s, d) => s + d.pendientes, 0)
  const pctGeneral = fAsignados > 0 ? Math.round((fAprobados / fAsignados) * 100) : 0

  const isEmpty = fAsignados === 0

  const stats = [
    { color: colorPct(pctGeneral), label: "Cumplimiento", value: `${pctGeneral}%` },
    { color: COLORS.aprobado, label: "Aprobados", value: `${fAprobados}/${fAsignados}` },
    { color: COLORS.reprobado, label: "Reprobados", value: fReprobados },
    { color: COLORS.pendiente, label: "Pendientes", value: fPendientes },
  ]

  return (
    <ExpandablePanel label="Cumplimiento general">
      {({ expanded, expandButton }) => (
        <>
            <PanelHeader
              actions={<>
                <DepartmentPager departments={departments} value={deptFilter} onChange={setDeptFilter} getValue={d => d.name} />
                {expandButton}
              </>}
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

            <CardContent className={panelBodyClass(expanded)}>
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
                <DeptPctLineChart
                  data={filteredDeptData}
                  meta={META}
                  ticks={[0, 25, 50, 80, 100]}
                  colorOf={colorPct}
                  tooltip={<BarTooltip />}
                  ariaLabel={`Cumplimiento por departamento: ${pctGeneral}% en ${filteredDeptData.length} departamentos`}
                  expanded={expanded}
                  animate={!skip}
                />
              )}
            </CardContent>
        </>
      )}
    </ExpandablePanel>
  )
}
