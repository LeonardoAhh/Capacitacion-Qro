"use client"
import { useState, useEffect, useMemo, type ReactNode } from "react"
import Link from "next/link"
import {
  Building2,
  CalendarCheck,
  Clock,
  EllipsisVertical,
  FolderOpen,
  LayoutGrid,
  Trash2,
  UserCheck,
  UserRoundPen,
  type LucideIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { HeaderSearch } from "@/components/ui/header-search"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CompactPager } from "@/components/ui/compact-pager"
import {
  DEFAULT_FILTER_OPERATORS,
  FilterBar,
  matchesFilterTokens,
  type Filter,
  type FilterFieldDef,
} from "@/components/ui/filter-token-bar"
import { REGISTROS_SECCIONES, registrosEmpleadoHref } from "@/components/content/plantilla-paths"
import { CATALOGO_ORGANIZACIONAL, TURNOS } from "@/lib/catalogo"
import { requiereAtencion, type Employee, type NuevoIngreso } from "@/lib/hooks"
import { useRole } from "@/lib/hooks/useRole"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 9
const HEAD = "whitespace-nowrap text-eyebrow uppercase"

const INGRESO_OPTIONS = [
  { value: "nuevos-ingresos", label: "Nuevos ingresos" },
  { value: "atencion", label: "Con atención" },
] as const

const EMPLOYEE_FILTER_FIELDS: FilterFieldDef[] = [
  {
    id: "departamento",
    label: "Departamento",
    icon: <Building2 aria-hidden="true" />,
    operators: DEFAULT_FILTER_OPERATORS,
    options: Object.keys(CATALOGO_ORGANIZACIONAL).map((d) => ({ value: d, label: d })),
  },
  {
    id: "turno",
    label: "Turno",
    icon: <Clock aria-hidden="true" />,
    operators: DEFAULT_FILTER_OPERATORS,
    options: TURNOS.map((t) => ({ value: t, label: t })),
  },
  {
    id: "ingreso",
    label: "Seguimiento",
    icon: <UserCheck aria-hidden="true" />,
    operators: DEFAULT_FILTER_OPERATORS,
    options: INGRESO_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
  },
]

/** Pantallas de cada empleado, en el orden del menú. Las que piden número se omiten sin él. */
function employeeLinks(emp: Employee): { href: string; label: string; icon: LucideIcon }[] {
  return [
    { href: `/plantilla/matriz/${encodeURIComponent(emp.id)}`, label: "Matriz de capacitación", icon: LayoutGrid },
    // Incidencias, actas, incumplimientos, retardos y omisiones: una página con apartados internos.
    ...(emp.numero ? [
      { href: registrosEmpleadoHref(emp.numero, REGISTROS_SECCIONES[0]), label: "Registros", icon: FolderOpen },
    ] : []),
  ]
}

interface CapHistorialTabProps {
  employees: Employee[]
  /** Seguimiento de ingreso por número de empleado. */
  ingresos: ReadonlyMap<string, NuevoIngreso>
  loadingEmployees: boolean
  canEdit: boolean
  /** Alta, pendientes e incidencias (solo quien edita). */
  acciones?: ReactNode
  onEditEmployee: (emp: Employee) => void
  onDeleteEmployee: (emp: Employee) => void
  onSeguimiento: (ingreso: NuevoIngreso) => void
}

export function CapHistorialTab({
  employees, ingresos, loadingEmployees, canEdit, acciones,
  onEditEmployee, onDeleteEmployee, onSeguimiento,
}: CapHistorialTabProps) {
  const { canAccess } = useRole()
  const [empSearch, setEmpSearch] = useState("")
  // Llegada desde enlace viejo de /ingresos (?filtro=...): abre con ese filtro aplicado.
  const [filters, setFilters] = useState<Filter[]>(() => {
    if (typeof window === "undefined") return []
    const pedido = new URLSearchParams(window.location.search).get("filtro")
    if (pedido === "nuevos-ingresos" || pedido === "atencion") {
      return [{ id: "url-ingreso", field: "ingreso", operator: "is", values: [pedido] }]
    }
    return []
  })
  const [empPage, setEmpPage] = useState(1)

  const ingresoDe = (emp: Employee) => (emp.numero ? ingresos.get(emp.numero) : undefined)

  const filtered = useMemo(() => {
    const query = empSearch.toLowerCase()
    return employees
      .filter((e) => {
        if (
          query &&
          !e.nombre.toLowerCase().includes(query) &&
          !(e.numero ?? "").toLowerCase().includes(query) &&
          !(e.departamento ?? "").toLowerCase().includes(query) &&
          !(e.puesto ?? "").toLowerCase().includes(query)
        ) {
          return false
        }
        return matchesFilterTokens(filters, (fieldId) => {
          if (fieldId === "departamento") return e.departamento ?? ""
          if (fieldId === "turno") return e.turno ?? ""
          if (fieldId === "ingreso") {
            const ingreso = ingresoDe(e)
            if (!ingreso) return []
            return requiereAtencion(ingreso) ? ["nuevos-ingresos", "atencion"] : ["nuevos-ingresos"]
          }
          return null
        })
      })
      .sort((a, b) => parseInt(b.numero ?? "0", 10) - parseInt(a.numero ?? "0", 10))
  }, [employees, empSearch, filters, ingresos])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(empPage, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => { setEmpPage(1) }, [empSearch, filters])

  return (
    <div className="space-y-4">
      <HeaderSearch
        label="Buscar empleado"
        placeholder="Buscar empleado…"
        value={empSearch}
        onValueChange={setEmpSearch}
      />
      <div className="@container flex flex-wrap items-center gap-2">
        <FilterBar
          fields={EMPLOYEE_FILTER_FIELDS}
          value={filters}
          onChange={setFilters}
          aria-label="Filtros de empleados"
        />
        <div className="ml-auto flex items-center gap-2">
          {acciones}
          <CompactPager label="Paginación de empleados" page={safePage} totalPages={totalPages} onPageChange={setEmpPage} />
        </div>
      </div>

      {loadingEmployees ? (
        <div className="space-y-2" role="status" aria-label="Cargando empleados">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-(--control-height) w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed px-(--card-padding) py-12 text-center text-body-md text-muted-foreground">
          {employees.length === 0
            ? "Sin empleados registrados."
            : "No se encontraron empleados con esa búsqueda."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table className="table-fixed">
            <caption className="sr-only">Empleados</caption>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className={HEAD}>Empleado</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden md:table-cell")}>Puesto</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-44 lg:table-cell")}>Departamento</TableHead>
                <TableHead scope="col" className={cn(HEAD, "w-36")}>Ingreso</TableHead>
                <TableHead className="w-14 px-1"><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(emp => {
                const ingreso = ingresoDe(emp)
                return (
                <TableRow key={emp.id}>
                  <TableCell>
                    <span className="block truncate text-label-sm text-foreground">{emp.nombre}</span>
                    <span className="block truncate text-body-sm tabular-nums text-muted-foreground">
                      #{emp.numero ?? "-"}{emp.puesto && <span className="font-normal md:hidden"> · {emp.puesto}</span>}
                    </span>
                  </TableCell>
                  <TableCell className="hidden truncate text-body-sm text-muted-foreground md:table-cell">{emp.puesto ?? "-"}</TableCell>
                  <TableCell className="hidden truncate text-body-sm text-muted-foreground lg:table-cell">{emp.departamento ?? "-"}</TableCell>
                  <TableCell>
                    {/* Solo los nuevos ingresos; en ámbar si algo de su seguimiento ya venció. */}
                    {ingreso && (requiereAtencion(ingreso)
                      ? <Badge variant="warning" size="sm">Atención</Badge>
                      : <Badge variant="info" size="sm">Nuevo ingreso</Badge>)}
                  </TableCell>
                  <TableCell className="px-1 py-0 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label={`Más opciones para ${emp.nombre}`}>
                          <EllipsisVertical aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Solo las pantallas que el rol puede abrir (lib/constants/roles). */}
                        {ingreso && (
                          <DropdownMenuItem onSelect={() => onSeguimiento(ingreso)}>
                            <CalendarCheck aria-hidden="true" />
                            Seguimiento de ingreso
                          </DropdownMenuItem>
                        )}
                        {employeeLinks(emp).filter(link => canAccess(link.href)).map(({ href, label, icon: Icon }) => (
                          <DropdownMenuItem key={href} asChild>
                            <Link href={href}>
                              <Icon aria-hidden="true" />
                              {label}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                        {canEdit && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => onEditEmployee(emp)}>
                              <UserRoundPen aria-hidden="true" />
                              Editar empleado
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onDeleteEmployee(emp)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                              <Trash2 aria-hidden="true" />
                              Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
