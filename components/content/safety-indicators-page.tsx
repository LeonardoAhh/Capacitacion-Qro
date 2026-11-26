"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ClipboardCheck, HeartPulse } from "lucide-react"
import { CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionNavLayout, type SectionNavItem } from "@/components/ui/section-nav-layout"
import {
  CHART_LINE_CURSOR, CHART_TOOLTIP_CLASS, chartActiveDot, chartDot, ExpandablePanel, PanelEmpty, PanelError,
  PanelHeader, PanelLegend, PanelPager, PanelStats, panelBodyClass, panelChartClass,
} from "@/components/dashboard-panel"
import { isFindingOverdue } from "@/components/content/safety-home/finding-constraints"
import { loadFindingSummaries, type FindingSummary } from "@/components/content/safety-home/findings-data"
import { useTheme } from "@/components/theme-context"
import { hoyISO } from "@/lib/fechas"
import { useMediaQuery } from "@/lib/hooks/useMediaQuery"
import { MESES } from "@/lib/plan-anual"
import { cargarAccidentes, META_INCIDENTES_MES, racha, type Accidente } from "@/lib/salud-ocupacional"
import { describeSupabaseError } from "@/lib/supabase/errors"
import { cn } from "@/lib/utils"

const LINE_COLOR = "hsl(var(--chart-3))"
/** Ancho mínimo por departamento: con muchos, la gráfica hace scroll horizontal en vez de encimar nombres. */
const MIN_WIDTH_PER_DEPT = 72
const abrevDept = (nombre: string) => nombre.length <= 12 ? nombre : `${nombre.substring(0, 11)}…`

/** Una línea por estado; vencidos en el color de error, como su etiqueta en Safe Walk. */
const SERIES_HALLAZGOS = [
  { key: "abiertos", label: "Abiertos", color: "hsl(var(--chart-2))" },
  { key: "seguimiento", label: "En seguimiento", color: "hsl(var(--chart-3))" },
  { key: "vencidos", label: "Vencidos", color: "hsl(var(--destructive))" },
  { key: "cerrados", label: "Cerrados", color: "hsl(var(--chart-1))" },
] as const

type Seccion = "hallazgos" | "accidentes"
const SECCIONES: readonly SectionNavItem<Seccion>[] = [
  { id: "hallazgos", label: "Hallazgos", icon: ClipboardCheck },
  { id: "accidentes", label: "Accidentes", icon: HeartPulse },
]

interface DepartamentoHallazgos {
  departamento: string
  abiertos: number
  seguimiento: number
  vencidos: number
  cerrados: number
}

/** Hallazgos por departamento; primero los que tienen más vencidos y luego más abiertos. */
function porDepartamento(hallazgos: FindingSummary[]): DepartamentoHallazgos[] {
  const grupos = new Map<string, DepartamentoHallazgos>()
  for (const hallazgo of hallazgos) {
    const fila = grupos.get(hallazgo.area) ?? { departamento: hallazgo.area, abiertos: 0, seguimiento: 0, vencidos: 0, cerrados: 0 }
    if (hallazgo.status === "Abierto") fila.abiertos++
    if (hallazgo.status === "En seguimiento") fila.seguimiento++
    if (hallazgo.status === "Cerrado") fila.cerrados++
    if (isFindingOverdue(hallazgo)) fila.vencidos++
    grupos.set(hallazgo.area, fila)
  }
  return [...grupos.values()].sort((a, b) =>
    b.vencidos - a.vencidos || b.abiertos - a.abiertos || a.departamento.localeCompare(b.departamento, "es-MX"))
}

function DepartamentoTooltip({ active, payload }: { active?: boolean; payload?: { payload: DepartamentoHallazgos }[] }) {
  if (!active || !payload?.length) return null
  const fila = payload[0].payload
  return (
    <div className={CHART_TOOLTIP_CLASS}>
      <p className="mb-1.5 truncate text-label-sm text-foreground">{fila.departamento}</p>
      <ul className="space-y-1">
        {SERIES_HALLAZGOS.map(serie => (
          <li key={serie.key} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 shrink-0 rounded-sm" style={{ background: serie.color }} aria-hidden="true" />
              {serie.label}
            </span>
            <span className="text-foreground">{fila[serie.key]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function HallazgosPanel({ hallazgos }: { hallazgos: FindingSummary[] }) {
  const filas = useMemo(() => porDepartamento(hallazgos), [hallazgos])
  const prefersReduced = useMediaQuery("(prefers-reduced-motion: reduce)")
  const { reducedMotion } = useTheme()
  const skip = prefersReduced || reducedMotion
  const total = (key: keyof Omit<DepartamentoHallazgos, "departamento">) => filas.reduce((sum, fila) => sum + fila[key], 0)

  return (
    <ExpandablePanel label="Hallazgos por departamento">
      {({ expanded, expandButton }) => (
        <>
          <PanelHeader actions={expandButton}>
            <PanelStats items={[
              { label: "Abiertos", value: total("abiertos") },
              { label: "En seguimiento", value: total("seguimiento") },
              { label: "Vencidos", value: total("vencidos") },
              { label: "Cerrados", value: total("cerrados") },
            ]} />
          </PanelHeader>
          <CardContent className={panelBodyClass(expanded)}>
            {filas.length === 0 ? (
              <PanelEmpty icon={<ClipboardCheck className="size-6 text-muted-foreground" aria-hidden="true" />} title="Sin hallazgos registrados." />
            ) : (
              <>
                <div className={cn("w-full overflow-x-auto", expanded && "flex min-h-0 flex-1 flex-col")} role="img"
                  aria-label={`Hallazgos de ${filas.length} departamentos: ${total("abiertos")} abiertos, ${total("vencidos")} vencidos`}>
                  <div className={cn("text-muted-foreground", panelChartClass(expanded, "h-80"))} style={{ minWidth: filas.length * MIN_WIDTH_PER_DEPT }}>
                    <ResponsiveContainer className="text-body-sm" width="100%" height="100%">
                      <LineChart data={filas} margin={{ top: 16, right: 16, left: -16, bottom: 0 }}>
                        <XAxis dataKey="departamento" tickFormatter={abrevDept} tick={{ fill: "currentColor" }} tickLine={false} axisLine={false}
                          interval={0} angle={-35} textAnchor="end" height={72} padding={{ left: 16, right: 16 }} />
                        <YAxis tick={{ fill: "currentColor" }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip content={<DepartamentoTooltip />} cursor={CHART_LINE_CURSOR} />
                        {SERIES_HALLAZGOS.map(serie => (
                          <Line key={serie.key} name={serie.label} type="monotone" dataKey={serie.key} stroke={serie.color} strokeWidth={2}
                            dot={chartDot(serie.color)} activeDot={chartActiveDot(serie.color)} isAnimationActive={!skip} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <PanelLegend className="mt-3" items={SERIES_HALLAZGOS} />
              </>
            )}
          </CardContent>
        </>
      )}
    </ExpandablePanel>
  )
}

interface PuntoMes { mes: string; nombre: string; accidentes: number }

function MesTooltip({ active, payload }: { active?: boolean; payload?: { payload: PuntoMes }[] }) {
  if (!active || !payload?.length) return null
  const punto = payload[0].payload
  return (
    <div className={CHART_TOOLTIP_CLASS}>
      <p className="mb-1 text-label-sm text-foreground">{punto.nombre}</p>
      <p className="text-muted-foreground">
        {punto.accidentes === 1 ? "1 accidente" : `${punto.accidentes} accidentes`} · meta {META_INCIDENTES_MES}
      </p>
    </div>
  )
}

function AccidentesPanel({ accidentes }: { accidentes: Accidente[] }) {
  const hoy = hoyISO()
  const anioActual = hoy.slice(0, 4)
  const anios = useMemo(
    () => [...new Set([anioActual, ...accidentes.map(accidente => accidente.fecha.slice(0, 4))])].sort(),
    [accidentes, anioActual],
  )
  const [anio, setAnio] = useState(anioActual)
  const indice = anios.indexOf(anio)
  const prefersReduced = useMediaQuery("(prefers-reduced-motion: reduce)")
  const { reducedMotion } = useTheme()
  const skip = prefersReduced || reducedMotion

  const puntos: PuntoMes[] = MESES.map((nombre, index) => {
    const mes = `${anio}-${String(index + 1).padStart(2, "0")}`
    return { mes, nombre, accidentes: accidentes.filter(accidente => accidente.fecha.startsWith(mes)).length }
  })
  const totalAnio = puntos.reduce((sum, punto) => sum + punto.accidentes, 0)
  const mesesSobreMeta = puntos.filter(punto => punto.accidentes > META_INCIDENTES_MES).length

  return (
    <ExpandablePanel label="Accidentes por mes">
      {({ expanded, expandButton }) => (
        <>
          <PanelHeader actions={<>
            <PanelPager
              label="Año"
              previousLabel={indice > 0 ? `Año anterior: ${anios[indice - 1]}` : "Sin año anterior"}
              nextLabel={indice < anios.length - 1 ? `Año siguiente: ${anios[indice + 1]}` : "Sin año siguiente"}
              onPrevious={indice > 0 ? () => setAnio(anios[indice - 1]) : undefined}
              onNext={indice < anios.length - 1 ? () => setAnio(anios[indice + 1]) : undefined}
            >
              {anio}
            </PanelPager>
            {expandButton}
          </>}>
            <PanelStats items={[
              { label: `Accidentes ${anio}`, value: totalAnio },
              { label: "Meses sobre la meta", value: mesesSobreMeta },
              { label: "Días sin accidentes", value: racha(accidentes, hoy).actual },
            ]} />
          </PanelHeader>
          <CardContent className={panelBodyClass(expanded)}>
            {/* Aun sin accidentes la gráfica se muestra: la línea en cero contra la meta también informa. */}
            <div role="img" aria-label={`Accidentes por mes en ${anio}: ${totalAnio} en total, meta de ${META_INCIDENTES_MES} al mes`}
              className={cn("text-muted-foreground", panelChartClass(expanded, "h-72"))}>
              <ResponsiveContainer className="text-body-sm" width="100%" height="100%">
                <LineChart data={puntos} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="nombre" tickFormatter={(nombre: string) => nombre.slice(0, 3)} tick={{ fill: "currentColor" }}
                    tickLine={false} axisLine={false} interval={0} padding={{ left: 16, right: 16 }} />
                  <YAxis tick={{ fill: "currentColor" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <ReferenceLine y={META_INCIDENTES_MES} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4"
                    label={{ value: "Meta", position: "insideTopRight", fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<MesTooltip />} cursor={CHART_LINE_CURSOR} />
                  <Line type="monotone" dataKey="accidentes" stroke={LINE_COLOR} strokeWidth={2}
                    dot={chartDot(LINE_COLOR)} activeDot={chartActiveDot(LINE_COLOR)} isAnimationActive={!skip} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </>
      )}
    </ExpandablePanel>
  )
}

/** Indicadores de Seguridad e Higiene: hallazgos por departamento y accidentes por mes contra la meta. */
export function SafetyIndicatorsPage() {
  const [datos, setDatos] = useState<{ hallazgos: FindingSummary[]; accidentes: Accidente[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [seccion, setSeccion] = useState<Seccion>("hallazgos")

  const cargar = useCallback(async () => {
    setError(null)
    try {
      const [hallazgos, accidentes] = await Promise.all([loadFindingSummaries(), cargarAccidentes()])
      setDatos({ hallazgos, accidentes })
    } catch (caught) {
      setError(describeSupabaseError(caught, "No se pudieron cargar los indicadores"))
    }
  }, [])

  useEffect(() => { void cargar() }, [cargar])

  if (error) return <PanelError message={error} onRetry={() => void cargar()} />
  if (!datos) {
    return (
      <div role="status" aria-label="Cargando indicadores">
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <SectionNavLayout label="Indicadores de seguridad" items={SECCIONES} value={seccion} onValueChange={setSeccion}>
      {seccion === "hallazgos"
        ? <HallazgosPanel hallazgos={datos.hallazgos} />
        : <AccidentesPanel accidentes={datos.accidentes} />}
    </SectionNavLayout>
  )
}
