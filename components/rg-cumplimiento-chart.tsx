"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList, ReferenceLine,
} from "recharts"
import { ShieldCheck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CHART_TOOLTIP_CLASS, PanelEmpty, PanelError, PanelHeader, PanelStats } from "@/components/dashboard-panel"
import { useTheme } from "@/components/theme-context"
import { useMediaQuery } from "@/lib/hooks/useMediaQuery"
import {
  useRgCumplimiento, QUARTERS, META_RG as META,
  colorPctRg as colorPct, type DeptDataRg as DeptData, type QuarterId,
} from "@/lib/hooks/useRgCumplimiento"
import { cn } from "@/lib/utils"

interface RgTooltipEntry { payload: DeptData }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: RgTooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  const cumple = d.pct >= META
  return (
    <div className={CHART_TOOLTIP_CLASS}>
      <p className="mb-1.5 truncate text-label-sm text-foreground">{label}</p>
      <div className="space-y-1 text-muted-foreground">
        <div className="flex items-center justify-between gap-4">
          <span>Entregados</span>
          <span className="font-bold text-chart-1-deep">{d.entregados}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Total</span>
          <span className="font-medium text-foreground">{d.total}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-4 border-t pt-1">
          <span>Cumplimiento</span>
          <span className={cn("font-bold", cumple ? "text-chart-1-deep" : "text-destructive")}>{d.pct}%</span>
        </div>
        <p className={cn("pt-0.5", cumple ? "text-chart-1-deep" : "text-destructive")}>
          {cumple ? `Cumple meta (≥ ${META}%)` : `Bajo meta (< ${META}%)`}
        </p>
      </div>
    </div>
  )
}

function SkeletonContent() {
  return (
    <div role="status" aria-label="Cargando RG-REC-048" className="space-y-3">
      <span className="sr-only">Cargando cumplimiento de RG-REC-048…</span>
      {[78, 55, 90, 42, 68].map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-3.5 w-20 shrink-0" />
          <Skeleton className="h-5 rounded-sm" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  )
}

export default function RgCumplimientoChart() {
  const {
    loading, error, quarter, setQuarter, año, setAño,
    chartData, totalGeneral, entregadosGeneral, pctGeneral,
    añosDisponibles, cargar,
  } = useRgCumplimiento()

  const prefersReduced = useMediaQuery("(prefers-reduced-motion: reduce)")
  const { reducedMotion } = useTheme()
  const skip = prefersReduced || reducedMotion

  const abrevDept = (n: string) => n.length <= 12 ? n : n.substring(0, 11) + "…"

  const kpiBadges = [
    { color: colorPct(pctGeneral), label: "Cumplimiento", value: `${pctGeneral}%` },
    { color: "hsl(var(--chart-1))", label: "Entregados", value: `${entregadosGeneral}/${totalGeneral}` },
  ]

  return (
    <Card>
      <PanelHeader
        description="Entregas por departamento"
        actions={
          <Select value={año} onValueChange={setAño}>
            <SelectTrigger aria-label="Filtrar por año" className="w-full sm:w-auto"><SelectValue /></SelectTrigger>
            <SelectContent>
              {añosDisponibles.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      >
        {!loading && !error && totalGeneral > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <PanelStats items={kpiBadges} />
            <Badge variant={pctGeneral >= META ? "success" : "destructive"} size="sm">
              {pctGeneral >= META ? "Cumple" : "Bajo meta"} · {META}%
            </Badge>
          </div>
        )}
        <Tabs value={quarter} onValueChange={v => setQuarter(v as QuarterId)}>
          <TabsList className="grid w-full grid-cols-4">
            {QUARTERS.map(q => (
              <TabsTrigger key={q.id} value={q.id} className="px-1.5 sm:px-3">{q.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </PanelHeader>

      <CardContent className="p-(--card-padding) pt-0">
        {loading ? (
          <SkeletonContent />
        ) : error ? (
          <PanelError message={error} onRetry={() => void cargar()} />
        ) : totalGeneral === 0 ? (
          <PanelEmpty
            icon={<ShieldCheck className="size-6 text-muted-foreground" aria-hidden="true" />}
            title="Sin registros en este trimestre."
          />
        ) : (
          <>
            <div
              className="w-full overflow-x-auto"
              role="img"
              aria-label={`Cumplimiento RG-REC-048: ${pctGeneral}% en ${chartData.length} departamentos`}
            >
              <ResponsiveContainer className="text-body-sm" width="100%" height={chartData.length * 48 + 40} minHeight={160}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted-foreground/15" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fill: "currentColor" }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    ticks={[0, 25, 50, 70, 100]}
                  />
                  <ReferenceLine
                    x={META}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="4 4"
                    label={{ value: `Meta ${META}%`, position: "top", fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="departamento"
                    width={110}
                    tick={{ fill: "currentColor" }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={abrevDept}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                  <Bar
                    dataKey="pct"
                    radius={[0, 4, 4, 0]}
                    background={{ fill: "hsl(var(--muted) / 0.2)", radius: 4 }}
                    isAnimationActive={!skip}
                    animationDuration={skip ? 0 : 600}
                    animationEasing="ease-out"
                  >
                    {chartData.map((e, i) => <Cell key={i} fill={colorPct(e.pct)} />)}
                    <LabelList dataKey="pct" position="right" formatter={(v: unknown) => `${v}%`} style={{ fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-4 text-body-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 shrink-0 rounded-sm" style={{ background: "hsl(var(--chart-1))" }} aria-hidden="true" />
                Cumple (≥ {META}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 shrink-0 rounded-sm" style={{ background: "hsl(var(--destructive))" }} aria-hidden="true" />
                Bajo meta (&lt; {META}%)
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
