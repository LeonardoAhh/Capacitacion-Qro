"use client"

import { useState } from "react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Timer } from "lucide-react"
import { CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CHART_LINE_CURSOR, CHART_TOOLTIP_CLASS, chartActiveDot, chartDot, ExpandablePanel, PanelEmpty, PanelError, PanelHeader, PanelLegend, PanelPager,
  panelBodyClass, panelChartClass,
} from "@/components/dashboard-panel"
import { useTheme } from "@/components/theme-context"
import { useMediaQuery } from "@/lib/hooks/useMediaQuery"
import { cn } from "@/lib/utils"
import {
  lunesDe, semanaIso, sumarSemanas, useRegistrosSemana,
  type RegistrosDia, type RegistrosEmpleado,
} from "@/lib/hooks/useRegistrosSemana"
import { capitalize, type RegistroPorDiaConfig } from "@/lib/plantilla/registros-por-dia"

type Vista = "departamentos" | "personal"

/** La paleta tiene 5 tonos: del sexto departamento en adelante se repite el tono con línea punteada y punto hueco. */
const CHART_HUES = 5
const lineColor = (index: number) => `hsl(var(--chart-${(index % CHART_HUES) + 1}))`
const isSecondary = (index: number) => index >= CHART_HUES
const lineDash = (index: number) => (isSecondary(index) ? "5 4" : undefined)


const formatFecha = (fecha: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("es-MX", { ...options, timeZone: "UTC" }).format(new Date(`${fecha}T00:00:00Z`)).replace(".", "")
const diaCorto = (dia: RegistrosDia) => formatFecha(dia.fecha, { weekday: "short", day: "numeric" })

interface TooltipEntry { name: string; value: number; color: string; payload: RegistrosDia }

function DiaTooltip({ active, payload, plural }: { active?: boolean; payload?: TooltipEntry[]; plural: string }) {
  if (!active || !payload?.length) return null
  const filas = payload.filter(entry => entry.value > 0).sort((a, b) => b.value - a.value)
  return (
    <div className={CHART_TOOLTIP_CLASS}>
      <p className="mb-1.5 text-label-sm text-foreground">
        {formatFecha(payload[0].payload.fecha, { weekday: "long", day: "numeric", month: "long" })}
      </p>
      {filas.length === 0 ? (
        <p className="text-muted-foreground">Sin {plural}</p>
      ) : (
        <ul className="space-y-1">
          {filas.map(entry => (
            <li key={entry.name} className="flex items-center justify-between gap-4">
              <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <span className="size-2 shrink-0 rounded-sm" style={{ background: entry.color }} aria-hidden="true" />
                <span className="truncate">{entry.name}</span>
              </span>
              <span className="text-foreground">{entry.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SemanaPager({ lunes, actual, onChange }: { lunes: string; actual: string; onChange: (lunes: string) => void }) {
  return (
    <PanelPager
      label="Semana"
      previousLabel="Semana anterior"
      nextLabel="Semana siguiente"
      onPrevious={() => onChange(sumarSemanas(lunes, -1))}
      onNext={lunes < actual ? () => onChange(sumarSemanas(lunes, 1)) : undefined}
      className="whitespace-nowrap"
    >
      Semana {semanaIso(lunes).semana}
    </PanelPager>
  )
}

function TablaPersonal({ empleados, plural }: { empleados: RegistrosEmpleado[]; plural: string }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Número</TableHead>
            <TableHead scope="col">Nombre</TableHead>
            <TableHead scope="col">Departamento</TableHead>
            <TableHead scope="col" className="text-right">{capitalize(plural)}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empleados.map(empleado => (
            <TableRow key={empleado.numero}>
              <TableCell className="tabular-nums">{empleado.numero}</TableCell>
              <TableCell>{empleado.nombre}</TableCell>
              <TableCell className="text-muted-foreground">{empleado.departamento}</TableCell>
              <TableCell className="text-right tabular-nums">{empleado.cantidad}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** Registros de la semana (retardos, omisiones…): top 10 departamentos por día o el personal con más registros. */
export default function RegistrosSemanaChart({ config, label }: { config: RegistroPorDiaConfig; label: string }) {
  const [actual] = useState(() => lunesDe(new Date()))
  const [lunes, setLunes] = useState(actual)
  const [vista, setVista] = useState<Vista>("departamentos")
  const { loading, error, data, refresh } = useRegistrosSemana(config, lunes)
  const prefersReduced = useMediaQuery("(prefers-reduced-motion: reduce)")
  const { reducedMotion } = useTheme()
  const skip = prefersReduced || reducedMotion
  const { semana } = semanaIso(lunes)

  return (
    <ExpandablePanel label={label}>
      {({ expanded, expandButton }) => (
        <>
          <PanelHeader actions={<><SemanaPager lunes={lunes} actual={actual} onChange={setLunes} />{expandButton}</>}>
            <Tabs value={vista} onValueChange={value => setVista(value as Vista)}>
              <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                <TabsTrigger value="departamentos">Departamentos</TabsTrigger>
                <TabsTrigger value="personal">Personal</TabsTrigger>
              </TabsList>
            </Tabs>
          </PanelHeader>

          <CardContent className={cn("space-y-4", panelBodyClass(expanded))}>
            {loading ? (
              <div role="status" aria-label={`Cargando ${config.plural}`} className={panelChartClass(expanded, "h-72")}>
                <span className="sr-only">Cargando {config.plural}…</span>
                <Skeleton className="h-full w-full rounded-xl" />
              </div>
            ) : error ? (
              <PanelError message={error} onRetry={refresh} />
            ) : !data || data.empleados.length === 0 ? (
              <PanelEmpty
                icon={<Timer className="size-6 text-muted-foreground" aria-hidden="true" />}
                title={`Sin ${config.plural} en la semana ${semana}.`}
              />
            ) : vista === "personal" ? (
              <TablaPersonal empleados={data.empleados} plural={config.plural} />
            ) : (
              <>
                <div
                  role="img"
                  aria-label={`${capitalize(config.plural)} por día de la semana ${semana} en los ${data.departamentos.length} departamentos con más ${config.plural}`}
                  className={cn("text-muted-foreground", panelChartClass(expanded, "h-72 dense:h-60"))}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dias} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <XAxis dataKey={diaCorto} tick={{ fill: "currentColor", className: "text-body-sm" }} tickLine={false} axisLine={false} interval={0} padding={{ left: 24, right: 24 }} />
                      <YAxis tick={{ fill: "currentColor", className: "text-body-sm" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<DiaTooltip plural={config.plural} />} cursor={CHART_LINE_CURSOR} />
                      {data.departamentos.map((nombre, index) => (
                        <Line
                          key={nombre}
                          name={nombre}
                          type="monotone"
                          dataKey={(dia: RegistrosDia) => dia.valores[index]}
                          stroke={lineColor(index)}
                          strokeWidth={2}
                          strokeDasharray={lineDash(index)}
                          dot={chartDot(lineColor(index), isSecondary(index))}
                          activeDot={chartActiveDot(lineColor(index))}
                          isAnimationActive={!skip}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <PanelLegend items={data.departamentos.map((nombre, index) => ({ label: nombre, color: lineColor(index), outline: isSecondary(index) }))} />
              </>
            )}
          </CardContent>
        </>
      )}
    </ExpandablePanel>
  )
}
