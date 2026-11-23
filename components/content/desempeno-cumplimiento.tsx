"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Clock3, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { SearchInput } from "@/components/ui/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ReadOnlyBanner } from "@/components/read-only-banner"
import { useRole } from "@/lib/hooks"
import { useCumplimientoDesempeno, type EmpleadoCumplimiento } from "@/lib/hooks/useCumplimientoDesempeno"
import { getPeriodoActual, type PeriodoModo } from "@/lib/catalogo"
import { DESEMPENO } from "@/lib/desempeno/presentation"
import { getVentanaEntrega } from "@/lib/desempeno/ventana-entrega"
import { cn } from "@/lib/utils"

type StatusFilter = "all" | "pendiente" | "entregada" | "no_aplica"

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "entregada", label: "Entregadas" },
  { value: "pendiente", label: "Pendientes" },
  { value: "no_aplica", label: "No aplica" },
]

const MODES: PeriodoModo[] = ["semestrales", "mensuales"]

const STATUSES = {
  auto: { icon: CheckCircle2, label: "Evaluación guardada", variant: "success" },
  manual: { icon: FileText, label: "Entrega manual", variant: "info" },
  pendiente: { icon: Clock3, label: "Pendiente", variant: "warning" },
  no_aplica: { icon: Clock3, label: "No aplica", variant: "secondary" },
} as const

const HEAD = "whitespace-nowrap text-eyebrow uppercase"
const dateFormatter = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" })

type OnManual = (numero: string, checked: boolean, fechaIngreso: string | null) => void
type OnPhysical = (numero: string, checked: boolean) => void

function EmployeeStatus({ employee }: { employee: EmpleadoCumplimiento }) {
  const status = STATUSES[employee.estatus]
  const Icon = status.icon
  return (
    <Badge variant={status.variant} size="sm" className="gap-1 whitespace-nowrap font-medium [&_svg]:size-3">
      <Icon aria-hidden="true" />{status.label}
    </Badge>
  )
}

/** Detalle del estado: calificación, elegibilidad o físico (solo lectura). */
function statusDetail(employee: EmpleadoCumplimiento, isReadOnly: boolean): string {
  if (employee.estatus === "no_aplica" && employee.motivoNoAplica) return "No elegible para este semestre"
  if (employee.estatus !== "auto") return ""
  return [
    employee.calificacionFinal != null && `${employee.calificacionFinal}%`,
    isReadOnly && `Físico ${employee.fisicoEntregado ? "recibido" : "pendiente"}`,
  ].filter(Boolean).join(" · ")
}

/** Interruptor de la fila: físico recibido (con evaluación) o entrega manual con confirmación. */
function EmployeeAction({ employee, saving, onManual, onPhysical }: {
  employee: EmpleadoCumplimiento; saving: boolean; onManual: OnManual; onPhysical: OnPhysical
}) {
  const [pendingManual, setPendingManual] = useState<boolean | null>(null)
  const switchId = `cumplimiento-${employee.id}`

  if (employee.estatus === "no_aplica") return null
  if (pendingManual !== null) {
    return (
      <Button type="button" size="sm" autoFocus disabled={saving}
        onClick={() => { onManual(employee.numero, pendingManual, employee.fechaIngreso); setPendingManual(null) }}
        onBlur={() => setPendingManual(null)}
        onKeyDown={(event) => { if (event.key === "Escape") setPendingManual(null) }}
        aria-label={`Confirmar ${pendingManual ? "entrega manual" : "retiro de entrega manual"} de ${employee.nombre}`}>
        Confirmar
      </Button>
    )
  }
  const physical = employee.estatus === "auto"
  return (
    <span className="inline-flex items-center gap-2">
      <label htmlFor={switchId} className="cursor-pointer whitespace-nowrap text-body-sm text-muted-foreground">{physical ? "Físico" : "Manual"}</label>
      <Switch id={switchId} disabled={saving}
        checked={physical ? employee.fisicoEntregado : employee.estatus === "manual"}
        onCheckedChange={(checked) => physical ? onPhysical(employee.numero, checked) : setPendingManual(checked)}
        aria-label={physical ? `Formato físico recibido de ${employee.nombre}` : `${employee.estatus === "manual" ? "Quitar" : "Registrar"} entrega manual de ${employee.nombre}`} />
    </span>
  )
}

/** Resumen del periodo en una sola franja. */
function Summary({ loading, items }: { loading: boolean; items: { label: string; value: number; detail: string }[] }) {
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-xl border bg-card lg:grid-cols-4">
      {items.map(({ label, value, detail }, index) => (
        <div key={label} className={cn("min-w-0 space-y-1 p-(--card-padding)", index % 2 === 1 && "border-l", index >= 2 && "border-t lg:border-t-0", index === 2 && "lg:border-l")}>
          <dt className="text-body-sm text-muted-foreground">{label}</dt>
          <dd className="text-heading-lg tabular-nums text-foreground">{loading ? <Skeleton className="h-7 w-12" /> : value}</dd>
          <dd className="truncate text-body-sm text-muted-foreground">{loading ? <Skeleton className="h-4 w-20" /> : detail}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Cumplimiento: barra lateral interna con modalidad, búsqueda, estado y
 * departamentos (en móvil, controles apilados); a la derecha el periodo, el
 * resumen y las personas del departamento elegido.
 */
export default function DesempenoCumplimientoContent() {
  const { isReadOnly } = useRole()
  const [mode, setMode] = useState<PeriodoModo>("semestrales")
  const periodo = getPeriodoActual(mode)
  const { loading, saving, error, deptGroups, resumen, marcarEntrega, marcarFisico } = useCumplimientoDesempeno(periodo)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [departamento, setDepartamento] = useState<string | null>(null)
  const delivery = mode === "semestrales" ? getVentanaEntrega(periodo) : null

  const visibleGroups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-MX")
    return deptGroups.map((group) => ({
      ...group,
      empleados: group.empleados.filter((employee) => {
        const matchesQuery = !query || [employee.nombre, employee.numero, employee.puesto, employee.area]
          .some((value) => value?.toLocaleLowerCase("es-MX").includes(query))
        const matchesStatus = statusFilter === "all"
          || (statusFilter === "entregada" && (employee.estatus === "auto" || employee.estatus === "manual"))
          || (statusFilter !== "entregada" && employee.estatus === statusFilter)
        return matchesQuery && matchesStatus
      }),
    })).filter((group) => group.empleados.length > 0)
  }, [deptGroups, search, statusFilter])

  // Departamento elegido; si los filtros lo dejan vacío, el primero con resultados.
  const active = visibleGroups.find((group) => group.departamento === departamento) ?? visibleGroups[0] ?? null
  const filtersActive = Boolean(search.trim() || statusFilter !== "all")
  const onManual: OnManual = (numero, checked, fechaIngreso) => void marcarEntrega(numero, checked, { fechaIngreso })
  const onPhysical: OnPhysical = (numero, checked) => void marcarFisico(numero, checked)

  return (
    <div className="min-w-0 space-y-6 dense:space-y-4">
      {isReadOnly && <ReadOnlyBanner />}

      <div className="grid items-start gap-6 dense:gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-3 md:sticky md:top-0 md:max-h-[calc(100dvh-var(--workspace-header-height)-2*var(--workspace-inset))]">
          <div role="group" aria-label="Modalidad de evaluación" className="grid grid-cols-2 gap-1 rounded-md border bg-muted p-1">
            {MODES.map((value) => (
              <Button key={value} type="button" size="sm" variant={mode === value ? "outline" : "ghost"}
                aria-pressed={mode === value} disabled={saving} onClick={() => setMode(value)}>
                {DESEMPENO.modes[value]}
              </Button>
            ))}
          </div>
          <SearchInput value={search} onValueChange={setSearch} label="Buscar por nombre, número, puesto o área" placeholder="Buscar persona…" />
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="w-full" aria-label="Filtrar por estado"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          {active && (
            <Select value={active.departamento} onValueChange={setDepartamento}>
              <SelectTrigger aria-label="Departamento" className="w-full md:hidden"><SelectValue /></SelectTrigger>
              <SelectContent>
                {visibleGroups.map((group) => <SelectItem key={group.departamento} value={group.departamento}>{group.departamento} · {group.porcentajeEntregadas}%</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <nav aria-label="Departamentos" className="hidden min-h-0 flex-1 overflow-y-auto md:block">
            {loading ? (
              <div className="space-y-1" aria-hidden="true">
                {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-(--control-height-sm) w-full" />)}
              </div>
            ) : (
              <ul className="space-y-0.5">
                {visibleGroups.map((group) => {
                  const current = group.departamento === active?.departamento
                  return (
                    <li key={group.departamento}>
                      <button type="button" aria-current={current || undefined} onClick={() => setDepartamento(group.departamento)}
                        className={cn("flex min-h-(--control-height-sm) w-full items-center gap-2 rounded-md px-2 text-left text-body-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                          current ? "bg-muted text-label-sm text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
                        <span className="min-w-0 flex-1 truncate">{group.departamento}</span>
                        <span className="shrink-0 text-body-sm tabular-nums text-muted-foreground">{group.porcentajeEntregadas}%</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </nav>
        </aside>

        <div className="min-w-0 space-y-4 dense:space-y-3">
          <div className="min-w-0">
            <p className="text-label-sm text-foreground">{periodo}</p>
            <p className="text-body-sm text-muted-foreground">
              {delivery ? `Recepción de físicos · ${delivery.estado} · ${dateFormatter.format(delivery.inicio)} – ${dateFormatter.format(delivery.fin)}` : "Periodo asignado automáticamente"}
            </p>
          </div>

          <Summary loading={loading} items={[
            { label: "Personas", value: resumen.total, detail: "En este periodo" },
            { label: "Entregadas", value: resumen.entregadas, detail: `${resumen.porcentajeEntregadas}% del total` },
            { label: "Pendientes", value: resumen.total - resumen.entregadas, detail: "Sin evaluación o entrega" },
            { label: "Físicos recibidos", value: resumen.fisicos, detail: `${resumen.porcentaje}% del total` },
          ]} />

          {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-body-md text-destructive">{error}</p>}

          {loading ? (
            <div className="space-y-2" aria-label="Cargando personas">
              {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-(--control-height) w-full" />)}
            </div>
          ) : !active ? (
            <p className="rounded-xl border border-dashed px-(--card-padding) py-12 text-center text-body-md text-muted-foreground">
              {filtersActive ? "No hay personas que coincidan con los filtros." : "No hay personas para este periodo."}
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              {/* Avance del departamento elegido. */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-(--card-padding) py-3">
                <p className="min-w-0 flex-1 text-body-sm text-muted-foreground">
                  {active.entregadas} de {active.total} entregadas · {active.fisicos} físicos recibidos
                </p>
                <span className="flex shrink-0 items-center gap-2">
                  <Progress value={active.porcentajeEntregadas} className="w-24 sm:w-32" aria-hidden="true" />
                  <span className="w-10 text-right text-label-sm tabular-nums text-foreground">{active.porcentajeEntregadas}%</span>
                </span>
              </div>
              <Table className="table-fixed">
                <caption className="sr-only">Cumplimiento de {active.departamento}</caption>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead scope="col" className={HEAD}>Empleado</TableHead>
                    <TableHead scope="col" className={cn(HEAD, "hidden w-52 sm:table-cell")}>Estado</TableHead>
                    {!isReadOnly && <TableHead scope="col" className={cn(HEAD, "w-32 text-right")}><span className="sr-only">Registro</span></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.empleados.map((employee) => {
                    const detail = statusDetail(employee, isReadOnly)
                    return (
                      <TableRow key={`${periodo}:${employee.id}`}>
                        <TableCell>
                          <span className="block truncate text-label-sm text-foreground">{employee.nombre}</span>
                          <span className="block truncate text-body-sm text-muted-foreground">
                            {[`#${employee.numero}`, employee.puesto, employee.origen === "nuevo_ingreso" && "Nuevo ingreso"].filter(Boolean).join(" · ")}
                          </span>
                          <span className="mt-1 block sm:hidden"><EmployeeStatus employee={employee} /></span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <EmployeeStatus employee={employee} />
                          <span className="mt-0.5 block truncate text-body-sm text-muted-foreground">{detail || " "}</span>
                        </TableCell>
                        {!isReadOnly && (
                          <TableCell className="text-right">
                            <EmployeeAction employee={employee} saving={saving} onManual={onManual} onPhysical={onPhysical} />
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
