"use client"

import type { ReactElement } from "react"
import { LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { CHART_LINE_CURSOR, chartPointDot, panelChartClass } from "@/components/dashboard-panel"
import { cn } from "@/lib/utils"

export interface DeptPct {
  departamento: string
  pct: number
}

/** Ancho mínimo por departamento: con muchos, la gráfica hace scroll horizontal en vez de encimar nombres. */
const MIN_WIDTH_PER_DEPT = 72
const abrevDept = (nombre: string) => nombre.length <= 12 ? nombre : `${nombre.substring(0, 11)}…`

/** Porcentaje por departamento en línea curva, con la meta como referencia y cada punto en el color de su estado. */
export function DeptPctLineChart<T extends DeptPct>({
  data, meta, ticks, colorOf, tooltip, ariaLabel, expanded, animate, metaLabel = false,
}: {
  data: T[]
  meta: number
  ticks: number[]
  colorOf: (pct: number) => string
  tooltip: ReactElement
  ariaLabel: string
  expanded: boolean
  animate: boolean
  /** Muestra "Meta N%" sobre la línea de referencia. */
  metaLabel?: boolean
}) {
  const pointColor = (item: T) => colorOf(item.pct)
  return (
    // Ampliada, el contenedor con scroll horizontal reparte el alto libre a la gráfica.
    <div className={cn("w-full overflow-x-auto", expanded && "flex min-h-0 flex-1 flex-col")} role="img" aria-label={ariaLabel}>
      <div
        className={cn("text-muted-foreground", panelChartClass(expanded, "h-80"))}
        style={{ minWidth: data.length * MIN_WIDTH_PER_DEPT }}
      >
        <ResponsiveContainer className="text-body-sm" width="100%" height="100%">
          <LineChart data={data} margin={{ top: 24, right: 16, left: -8, bottom: 0 }}>
            <XAxis
              dataKey="departamento"
              tickFormatter={abrevDept}
              tick={{ fill: "currentColor" }}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={72}
              padding={{ left: 16, right: 16 }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={ticks}
              tickFormatter={value => `${value}%`}
              tick={{ fill: "currentColor" }}
              tickLine={false}
              axisLine={false}
            />
            <ReferenceLine
              y={meta}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              label={metaLabel ? { value: `Meta ${meta}%`, position: "insideTopRight", fill: "hsl(var(--muted-foreground))" } : undefined}
            />
            <Tooltip content={tooltip} cursor={CHART_LINE_CURSOR} />
            <Line
              type="monotone"
              dataKey="pct"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              dot={chartPointDot(pointColor)}
              activeDot={chartPointDot(pointColor, true)}
              isAnimationActive={animate}
            >
              <LabelList dataKey="pct" position="top" offset={10} formatter={(value: unknown) => `${value}%`} className="fill-foreground text-label-sm" />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
