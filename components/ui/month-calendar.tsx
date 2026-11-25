"use client"

import { useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deISO, hoyISO, inicioMes, inicioSemana, sumarDias, sumarMeses } from "@/lib/fechas"
import { cn } from "@/lib/utils"

export interface CalendarEvent {
  id: string
  /** Día del evento, YYYY-MM-DD. */
  date: string
  title: string
  /** Ícono del marcador; sin él, un punto. */
  icon?: LucideIcon
  /** Color del marcador: texto para el ícono (p. ej. "text-chart-5") o fondo para el punto; por defecto, el primario. */
  tone?: string
}

interface MonthCalendarProps {
  /** Cualquier día del mes visible, YYYY-MM-DD. */
  month: string
  onMonthChange: (month: string) => void
  selected: string
  onSelect: (date: string) => void
  /** Clic o Enter sobre un día (no al moverse con flechas), p. ej. para abrir su detalle. */
  onActivate?: (date: string) => void
  events?: CalendarEvent[]
  /** Nombre accesible de la cuadrícula, p. ej. "Calendario de accidentes". */
  label: string
  /** Solo marcadores (ícono o punto) en todos los tamaños, sin títulos: el calendario no se satura. */
  markersOnly?: boolean
  /** Fondo extra de un día del mes (p. ej. la racha); el elegido y hoy se marcan aparte. */
  dayClassName?: (date: string) => string | undefined
  /** Cómo se nombran los eventos al leer un día: singular y plural. */
  countLabel?: readonly [string, string]
  /** Acciones de la página en la fila del mes, después de la navegación. */
  actions?: ReactNode
}

const MARCADORES_VISIBLES = 3

const DIAS_SEMANA = 7
/** Eventos visibles por día en pantallas medianas; el resto se resume como "+N". */
const EVENTOS_VISIBLES = 2

const TITULO_MES = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" })
const DIA_CORTO = new Intl.DateTimeFormat("es-MX", { weekday: "short" })
const DIA_INICIAL = new Intl.DateTimeFormat("es-MX", { weekday: "narrow" })
const DIA_COMPLETO = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

const capitalizar = (texto: string) => texto.charAt(0).toLocaleUpperCase("es-MX") + texto.slice(1)
export const formatDiaCompleto = (iso: string) => capitalizar(DIA_COMPLETO.format(deISO(iso)))

/** Semanas (de lunes a domingo) que cubren el mes; 4 a 6 según el mes. */
function semanasDelMes(month: string): string[][] {
  const primero = inicioMes(month)
  const ultimo = sumarDias(sumarMeses(primero, 1), -1)
  const semanas: string[][] = []
  for (let inicio = inicioSemana(primero); inicio <= ultimo; inicio = sumarDias(inicio, DIAS_SEMANA)) {
    semanas.push(Array.from({ length: DIAS_SEMANA }, (_, index) => sumarDias(inicio, index)))
  }
  return semanas
}

/**
 * Calendario mensual a todo el ancho. En móvil cada día muestra marcadores por evento;
 * desde md, los títulos, y las semanas se reparten el alto disponible: dentro de un
 * contenedor flexible el mes completo cabe en una sola pantalla. Con markersOnly, filas
 * compactas de alto fijo con el número y los marcadores en una línea. Teclado: flechas mueven el día (y el mes al salir de él),
 * Inicio/Fin van al inicio o fin de la semana, RePág/AvPág cambian de mes.
 */
export function MonthCalendar({ month, onMonthChange, selected, onSelect, onActivate, events = [], label, markersOnly = false, dayClassName, countLabel = ["actividad", "actividades"], actions }: MonthCalendarProps) {
  const hoy = hoyISO()
  const mesVisible = inicioMes(month)
  const semanas = semanasDelMes(mesVisible)
  const gridRef = useRef<HTMLDivElement>(null)
  const porDia = new Map<string, CalendarEvent[]>()
  for (const event of events) porDia.set(event.date, [...(porDia.get(event.date) ?? []), event])
  // El día enfocable es el seleccionado si está en el mes visible; si no, el primero del mes.
  const enfocable = inicioMes(selected) === mesVisible ? selected : mesVisible

  function moverA(date: string) {
    onSelect(date)
    if (inicioMes(date) !== mesVisible) onMonthChange(inicioMes(date))
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${date}"]`)?.focus())
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const destino = {
      ArrowLeft: sumarDias(date, -1),
      ArrowRight: sumarDias(date, 1),
      ArrowUp: sumarDias(date, -DIAS_SEMANA),
      ArrowDown: sumarDias(date, DIAS_SEMANA),
      Home: inicioSemana(date),
      End: sumarDias(inicioSemana(date), DIAS_SEMANA - 1),
      PageUp: sumarMeses(date, -1),
      PageDown: sumarMeses(date, 1),
    }[event.key]
    if (!destino) return
    event.preventDefault()
    moverA(destino)
  }

  return (
    <section aria-labelledby="month-calendar-title" className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3", !markersOnly && "md:flex md:min-h-0 md:flex-1 md:flex-col")}>
      <div className="flex items-center gap-2">
        <h2 id="month-calendar-title" className="mr-auto text-heading-md text-foreground" aria-live="polite">
          {capitalizar(TITULO_MES.format(deISO(mesVisible)))}
        </h2>
        {inicioMes(hoy) !== mesVisible && (
          <Button type="button" variant="outline" size="sm" onClick={() => moverA(hoy)}>Hoy</Button>
        )}
        <Button type="button" variant="ghost" size="icon" aria-label="Mes anterior" onClick={() => onMonthChange(sumarMeses(mesVisible, -1))}>
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Mes siguiente" onClick={() => onMonthChange(sumarMeses(mesVisible, 1))}>
          <ChevronRight aria-hidden="true" />
        </Button>
        {actions}
      </div>

      {/* Las líneas entre días salen del fondo del contenedor (gap-px), sin bordes dobles. */}
      <div ref={gridRef} role="grid" aria-label={label} style={{ "--semanas": semanas.length } as CSSProperties}
        className={cn("grid gap-px overflow-hidden rounded-xl border bg-border", !markersOnly && "md:min-h-0 md:flex-1 md:grid-rows-[auto_repeat(var(--semanas),minmax(0,1fr))]")}>
        <div role="row" className="grid grid-cols-7 gap-px">
          {semanas[0].map(date => (
            <div key={date} role="columnheader" aria-label={DIA_CORTO.format(deISO(date))}
              className="bg-muted/60 px-2 py-1.5 text-center text-eyebrow uppercase text-muted-foreground md:text-left">
              <span className="md:hidden" aria-hidden="true">{DIA_INICIAL.format(deISO(date))}</span>
              <span className="hidden md:inline" aria-hidden="true">{DIA_CORTO.format(deISO(date)).replace(".", "")}</span>
            </div>
          ))}
        </div>

        {semanas.map(semana => (
          <div key={semana[0]} role="row" className="grid grid-cols-7 gap-px">
            {semana.map(date => {
              const delDia = porDia.get(date) ?? []
              const fueraDeMes = inicioMes(date) !== mesVisible
              const esHoy = date === hoy
              const elegido = date === selected
              return (
                // La celda siempre es opaca: las líneas salen del fondo de la cuadrícula y un tinte
                // translúcido en la celda las dejaría ver (el color se agrisaba). El tinte va en el botón.
                <div key={date} role="gridcell" aria-selected={elegido} className="min-w-0 bg-card">
                  <button type="button" data-date={date} tabIndex={date === enfocable ? 0 : -1}
                    onClick={() => { moverA(date); onActivate?.(date) }} onKeyDown={event => onKeyDown(event, date)}
                    aria-label={`${formatDiaCompleto(date)}${esHoy ? ", hoy" : ""}, ${delDia.length ? `${delDia.length} ${delDia.length === 1 ? countLabel[0] : countLabel[1]}` : `sin ${countLabel[1]}`}`}
                    className={cn(
                      "flex h-11 w-full min-w-0 flex-col items-center gap-0.5 overflow-hidden p-1 text-left transition-colors sm:h-14 md:gap-1 md:p-1.5",
                      // Solo marcadores: alto fijo y compacto, número a la izquierda y marcadores a la derecha.
                      markersOnly ? "md:h-20 xl:h-24 md:flex-row md:items-start md:justify-between" : "md:h-full md:items-stretch",
                      fueraDeMes ? "bg-muted" : dayClassName?.(date),
                      "hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                      elegido && "bg-primary/5 ring-1 ring-inset ring-primary/40",
                    )}>
                    <span className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-md text-label-sm tabular-nums md:size-7",
                      esHoy ? "bg-primary text-primary-foreground" : fueraDeMes ? "text-muted-foreground" : "text-foreground",
                    )}>
                      {deISO(date).getDate()}
                    </span>
                    {/* Un marcador por evento (hasta 3, luego "+N"); con títulos, solo en móvil. */}
                    {delDia.length > 0 && (
                      <span aria-hidden="true" className={cn("flex items-center gap-0.5 md:gap-1", markersOnly ? "md:min-h-7" : "md:hidden")}>
                        {delDia.slice(0, MARCADORES_VISIBLES).map(event => event.icon
                          ? <event.icon key={event.id} className={cn("size-3.5 shrink-0 md:size-4", event.tone ?? "text-primary")} />
                          : <span key={event.id} className={cn("size-1.5 rounded-sm md:size-2", event.tone ?? "bg-primary")} />)}
                        {delDia.length > MARCADORES_VISIBLES && <span className="text-body-sm text-muted-foreground">+{delDia.length - MARCADORES_VISIBLES}</span>}
                      </span>
                    )}
                    {/* Desde md: títulos, con el resto resumido. */}
                    {!markersOnly && delDia.length > 0 && (
                      <span aria-hidden="true" className="hidden min-h-0 min-w-0 gap-1 md:grid">
                        {delDia.slice(0, EVENTOS_VISIBLES).map(event => (
                          <span key={event.id} className="truncate rounded-md bg-primary/10 px-1.5 py-0.5 text-body-sm text-primary">{event.title}</span>
                        ))}
                        {delDia.length > EVENTOS_VISIBLES && (
                          <span className="px-1.5 text-body-sm text-muted-foreground">+{delDia.length - EVENTOS_VISIBLES} más</span>
                        )}
                      </span>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
