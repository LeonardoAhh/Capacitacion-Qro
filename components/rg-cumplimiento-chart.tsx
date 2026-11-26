"use client"

import { ShieldCheck } from "lucide-react"
import { CardContent } from "@/components/ui/card"
import { DeptPctLineChart } from "@/components/dept-pct-line-chart"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CHART_TOOLTIP_CLASS, ExpandablePanel, PanelEmpty, PanelError, PanelHeader, PanelLegend, PanelPager, PanelStats, panelBodyClass,
} from "@/components/dashboard-panel"
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


  /** Años de menor a mayor: la flecha izquierda va al año anterior. */
  const años = [...añosDisponibles].sort((a, b) => Number(a) - Number(b))
  const añoIndex = años.indexOf(año)
  const añoAnterior = años[añoIndex - 1]
  const añoSiguiente = años[añoIndex + 1]

  const kpiBadges = [
    { color: colorPct(pctGeneral), label: "Cumplimiento", value: `${pctGeneral}%` },
    { color: "hsl(var(--chart-1))", label: "Entregados", value: `${entregadosGeneral}/${totalGeneral}` },
  ]

  return (
    <ExpandablePanel label="RG-REC-048">
      {({ expanded, expandButton }) => (
        <>
            <PanelHeader
              actions={<>
                <PanelPager
                  label="Año"
                  previousLabel={añoAnterior ? `Año anterior: ${añoAnterior}` : "Sin año anterior"}
                  nextLabel={añoSiguiente ? `Año siguiente: ${añoSiguiente}` : "Sin año siguiente"}
                  onPrevious={añoAnterior ? () => setAño(añoAnterior) : undefined}
                  onNext={añoSiguiente ? () => setAño(añoSiguiente) : undefined}
                >
                  {año}
                </PanelPager>
                {expandButton}
              </>}
            >
              {/* Cifras, trimestres y año en una sola línea; en pantallas angostas se acomodan en varias. */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {!loading && !error && totalGeneral > 0 && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <PanelStats items={kpiBadges} />
                    <Badge variant={pctGeneral >= META ? "success" : "destructive"} size="sm">
                      {pctGeneral >= META ? "Cumple" : "Bajo meta"} · {META}%
                    </Badge>
                  </div>
                )}
                <Tabs value={quarter} onValueChange={v => setQuarter(v as QuarterId)} className="w-full lg:ml-auto lg:w-auto">
                  <TabsList className="grid w-full grid-cols-4">
                    {QUARTERS.map(q => (
                      <TabsTrigger key={q.id} value={q.id} className="px-1.5 sm:px-3">{q.label}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            </PanelHeader>

            <CardContent className={panelBodyClass(expanded)}>
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
                  <DeptPctLineChart
                    data={chartData}
                    meta={META}
                    ticks={[0, 25, 50, 70, 100]}
                    colorOf={colorPct}
                    tooltip={<CustomTooltip />}
                    ariaLabel={`Cumplimiento RG-REC-048: ${pctGeneral}% en ${chartData.length} departamentos`}
                    expanded={expanded}
                    animate={!skip}
                    metaLabel
                  />
                  <PanelLegend className="mt-3" items={[
                    { label: `Cumple (≥ ${META}%)`, color: "hsl(var(--chart-1))" },
                    { label: `Bajo meta (< ${META}%)`, color: "hsl(var(--destructive))" },
                  ]} />
                </>
              )}
            </CardContent>
        </>
      )}
    </ExpandablePanel>
  )
}
