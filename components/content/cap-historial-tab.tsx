"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import {
  BadgeCheck, BookUp, EllipsisVertical, FolderOpen, LayoutGrid, Trash2, UserPlus, UserRoundPen, X, type LucideIcon,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { HeaderSearch } from "@/components/ui/header-search"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CompactPager } from "@/components/ui/compact-pager"
import { CARGAR_CURSOS_PATH, REGISTROS_SECCIONES, registrosEmpleadoHref } from "@/components/content/plantilla-paths"
import { FILTER_ALL } from "@/components/ui/filter-menu"
import { CATALOGO_ORGANIZACIONAL, TURNOS } from "@/lib/catalogo"
import type { Employee } from "@/lib/hooks"
import { useRole } from "@/lib/hooks/useRole"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 9
const HEAD = "whitespace-nowrap text-eyebrow uppercase"

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
  loadingEmployees: boolean
  canEdit: boolean
  newEmpSuccess: boolean
  onNewEmployee: () => void
  onEditEmployee: (emp: Employee) => void
  onDeleteEmployee: (emp: Employee) => void
}

export function CapHistorialTab({
  employees, loadingEmployees, canEdit,
  newEmpSuccess,
  onNewEmployee,
  onEditEmployee, onDeleteEmployee,
}: CapHistorialTabProps) {
  const { canAccess } = useRole()
  const [empSearch, setEmpSearch]         = useState("")
  const [empFilterDept, setEmpFilterDept] = useState(FILTER_ALL)
  const [empFilterTurno, setEmpFilterTurno] = useState(FILTER_ALL)
  const [empPage, setEmpPage]             = useState(1)

  const filtered = employees
    .filter(e =>
      e.nombre.toLowerCase().includes(empSearch.toLowerCase()) ||
      (e.numero ?? '').toLowerCase().includes(empSearch.toLowerCase()) ||
      (e.departamento ?? '').toLowerCase().includes(empSearch.toLowerCase()) ||
      (e.puesto ?? '').toLowerCase().includes(empSearch.toLowerCase())
    )
    .filter(e => empFilterDept  === FILTER_ALL || (e.departamento ?? '') === empFilterDept)
    .filter(e => empFilterTurno === FILTER_ALL || (e.turno ?? '') === empFilterTurno)
    .sort((a, b) => parseInt(b.numero ?? '0', 10) - parseInt(a.numero ?? '0', 10))

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(empPage, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => { setEmpPage(1) }, [empSearch, empFilterDept, empFilterTurno])

  const hasFilters = empSearch.trim() !== "" || empFilterDept !== FILTER_ALL || empFilterTurno !== FILTER_ALL
  const clearFilters = () => {
    setEmpSearch("")
    setEmpFilterDept(FILTER_ALL)
    setEmpFilterTurno(FILTER_ALL)
  }

  return (
    <div className="space-y-4">
      {newEmpSuccess && (
        <Alert className="border-success/30 bg-success/10">
          <BadgeCheck className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            Empleado registrado correctamente.
          </AlertDescription>
        </Alert>
      )}

      <HeaderSearch
        label="Buscar empleado"
        placeholder="Buscar empleado…"
        value={empSearch}
        onValueChange={setEmpSearch}
      />
      {/* Filtros independientes a la izquierda; Nuevo empleado y paginación a la derecha. */}
      <div className="@container flex flex-wrap items-center gap-2">
        <Select value={empFilterDept} onValueChange={setEmpFilterDept}>
          <SelectTrigger className="min-w-0 flex-1 sm:w-52 sm:flex-none" aria-label="Filtrar por departamento">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Departamentos</SelectItem>
            {Object.keys(CATALOGO_ORGANIZACIONAL).map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={empFilterTurno} onValueChange={setEmpFilterTurno}>
          <SelectTrigger className="w-32 shrink-0 sm:w-36" aria-label="Filtrar por turno">
            <SelectValue placeholder="Turno" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Turnos</SelectItem>
            {TURNOS.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="touch-target" onClick={clearFilters} aria-label="Limpiar todos los filtros">
            <X aria-hidden="true" />
            Limpiar
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {canEdit && (
            <Button asChild variant="outline" size="sm" className="touch-target">
              <Link href={CARGAR_CURSOS_PATH} aria-label="Cargar cursos">
                <BookUp aria-hidden="true" />
                <span className="hidden @3xl:inline">Cargar cursos</span>
              </Link>
            </Button>
          )}
          {canEdit && (
            <Button size="sm" className="touch-target" onClick={onNewEmployee} aria-label="Nuevo empleado">
              <UserPlus aria-hidden="true" />
              <span className="hidden @3xl:inline">Nuevo empleado</span>
            </Button>
          )}
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
            ? (canEdit ? 'Sin empleados registrados. Usa el botón "Nuevo empleado" para agregar.' : "Sin empleados registrados.")
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
                <TableHead className="w-14 px-1"><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <span className="block truncate text-label-sm text-foreground">{emp.nombre}</span>
                    <span className="block truncate text-body-sm tabular-nums text-muted-foreground">
                      #{emp.numero ?? "-"}{emp.puesto && <span className="font-normal md:hidden"> · {emp.puesto}</span>}
                    </span>
                  </TableCell>
                  <TableCell className="hidden truncate text-body-sm text-muted-foreground md:table-cell">{emp.puesto ?? "-"}</TableCell>
                  <TableCell className="hidden truncate text-body-sm text-muted-foreground lg:table-cell">{emp.departamento ?? "-"}</TableCell>
                  <TableCell className="px-1 py-0 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label={`Más opciones para ${emp.nombre}`}>
                          <EllipsisVertical aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Solo las pantallas que el rol puede abrir (lib/constants/roles). */}
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
