"use client"

import { useState } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList, ReferenceLine,
} from "recharts"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { PanelHeader, PanelStats } from "@/components/dashboard-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GraduationCap } from "lucide-react"
import {
  colorPct, META,
  COLORS_CUMPLIMIENTO as COLORS, type DeptCumplimiento,
} from "@/lib/hooks/useCumplimiento"
import { useCumplimientoShared } from "@/components/dashboard-cumplimiento-context"
import { useTheme } from "@/components/theme-context"

// ── Tooltip ──────────────────────────────────────────────────────────────────
interface BarTooltipEntry { payload: DeptCumplimiento }
function BarTooltip({ active, payload, label }: { active?: boolean; payload?: BarTooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="min-w-48 rounded-md border bg-popover p-3 shadow-[var(--floating-shadow)]">
      <p className="mb-1.5 truncate text-label-sm text-foreground">{label}</p>
      <div className="space-y-1 text-body-sm text-muted-foreground">
        {[
          { label: "Aprobados", value: d.aprobados, color: COLORS.aprobado, cls: "text-success" },
          { label: "Reprobados", value: d.reprobados, color: COLORS.reprobado, cls: "text-destructive" },
          { label: "Pendientes", value: d.pendientes, color: COLORS.pendiente, cls: "" },
        ].map(r => (
          <div key={r.label} className="flex justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-md" style={{ background: r.color }} />{r.label}
            </span>
            <span className={`font-bold ${r.cls}`}>{r.value}</span>
          </div>
        ))}
        <div className="flex justify-between gap-4 pt-1 mt-1 border-t">
          <span>Cumplimiento</span>
          <span className="font-bold" style={{ color: colorPct(d.pct) }}>{d.pct}%</span>
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonContent() {
  return (
    <div className="space-y-3" aria-label="Cargando cumplimiento">
      {[78, 55, 90, 42, 68].map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-3 w-24 shrink-0" />
          <div className="h-5 flex-1 overflow-hidden rounded-sm bg-muted/60">
            <motion.div className="h-full rounded-sm bg-muted-foreground/20"
              initial={{ width: 0 }} animate={{ width: `${w}%` }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }} />
          </div>
          <Skeleton className="h-3 w-8 shrink-0" />
        </div>
      ))}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function DashboardCumplimiento() {
  const {
    loading, departments, deptData,
    totalAsignados, totalAprobados, totalReprobados, totalPendientes,
    totalEmpleados, totalEmpleadosConPuesto,
  } = useCumplimientoShared()

  const prefersReduced = useReducedMotion()
  const { reducedMotion } = useTheme()
  const skip = !!(prefersReduced || reducedMotion)

  const [deptFilter, setDeptFilter] = useState<string>("all")

  const filteredDeptData = deptFilter === "all"
    ? deptData
    : deptData.filter(d => d.departamento.toLowerCase() === deptFilter.toLowerCase())

  const fAsignados  = deptFilter === "all" ? totalAsignados  : filteredDeptData.reduce((s, d) => s + d.asignados, 0)
  const fAprobados  = deptFilter === "all" ? totalAprobados  : filteredDeptData.reduce((s, d) => s + d.aprobados, 0)
  const fReprobados = deptFilter === "all" ? totalReprobados : filteredDeptData.reduce((s, d) => s + d.reprobados, 0)
  const fPendientes = deptFilter === "all" ? totalPendientes : filteredDeptData.reduce((s, d) => s + d.pendientes, 0)
  const pctGeneral  = fAsignados > 0 ? Math.round((fAprobados / fAsignados) * 100) : 0

  const isEmpty = fAsignados === 0
  const abrevDept = (n: string) => n.length <= 14 ? n : n.substring(0, 13) + "…"

  // Resumen en una línea: el avance general y su desglose; el detalle va en la gráfica.
  const stats = [
    { color: colorPct(pctGeneral), label: "Cumplimiento", value: `${pctGeneral}%` },
    { color: COLORS.aprobado,      label: "Aprobados",    value: `${fAprobados} de ${fAsignados}` },
    { color: COLORS.reprobado,     label: "Reprobados",   value: fReprobados },
    { color: COLORS.pendiente,     label: "Pendientes",   value: fPendientes },
  ]
  const descripcion = deptFilter === "all"
    ? `Cursos aprobados por puesto · ${totalEmpleadosConPuesto} de ${totalEmpleados} empleados con cursos configurados`
    : "Cursos aprobados por puesto"

  return (
    <Card>
      <PanelHeader description={descripcion} actions={
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger aria-label="Filtrar por departamento" className="w-full sm:w-auto">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Departamentos</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
      }>
        {!loading && !isEmpty && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <PanelStats items={stats} />
            <Badge variant={pctGeneral >= META ? "success" : "destructive"} size="sm">
              {pctGeneral >= META ? "Cumple" : "No cumple"} · meta {META}%
            </Badge>
          </div>
        )}
      </PanelHeader>

      <CardContent className="p-(--card-padding) pt-0">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <SkeletonContent />
            </motion.div>
          ) : isEmpty ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-(--card-padding) py-12 text-center">
              <GraduationCap className="size-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-body-md text-foreground">No hay datos de capacitación configurados aún.</p>
              <p className="text-body-sm text-muted-foreground">Configura puestos y sus cursos requeridos en la sección de Capacitación.</p>
            </motion.div>
          ) : (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>

              {/* Bar chart por departamento */}
              {filteredDeptData.length > 0 && (
                  <div className="w-full overflow-x-auto" role="img"
                    aria-label={`Cumplimiento por departamento: ${filteredDeptData.length} departamentos`}>
                    <ResponsiveContainer width="100%" height={filteredDeptData.length * 48 + 40} minHeight={160}>
                      <BarChart data={filteredDeptData} layout="vertical"
                        margin={{ top: 0, right: 44, left: 0, bottom: 0 }} barSize={24}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted-foreground/15" />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`}
                          tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground"
                          tickLine={false} axisLine={false} ticks={[0, 25, 50, 80, 100]} />
                        <YAxis type="category" dataKey="departamento" width={120}
                          tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground"
                          tickLine={false} axisLine={false} tickFormatter={abrevDept} />
                        <ReferenceLine x={META} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                        <Tooltip content={<BarTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                        <Bar dataKey="pct" radius={[0, 4, 4, 0]}
                          background={{ fill: "hsl(var(--muted) / 0.2)", radius: 4 }}
                          animationBegin={skip ? undefined : 100} animationDuration={skip ? 0 : 700} animationEasing="ease-out">
                          {filteredDeptData.map((e, i) => <Cell key={i} fill={colorPct(e.pct)} />)}
                          <LabelList dataKey="pct" position="right" formatter={(v: unknown) => `${v}%`}
                            style={{ fontSize: 11, fontWeight: 700 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
