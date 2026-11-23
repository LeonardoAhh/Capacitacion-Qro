"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import {
  AlarmClock, BadgeCheck, BookPlus, CalendarClock, ChevronDown, EllipsisVertical, FilePenLine, FileText, LayoutGrid, Layers, ShieldAlert, Trash2, UserPlus, UserRoundPen, Users, type LucideIcon,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { TOOLBAR_SEARCH, TabsToolbar } from "@/components/ui/tabs-toolbar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CompactPager } from "@/components/ui/compact-pager"
import { FILTER_ALL, FilterMenu } from "@/components/ui/filter-menu"
import { CATALOGO_ORGANIZACIONAL, TURNOS } from "@/lib/catalogo"
import type { Employee } from "@/lib/hooks"
import { useRole } from "@/lib/hooks/useRole"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 9
const HEAD = "whitespace-nowrap text-eyebrow uppercase"

/** Pantallas de cada empleado, en el orden del menú. Las que piden número se omiten sin él. */
function employeeLinks(emp: Employee): { href: string; label: string; icon: LucideIcon }[] {
  const numero = emp.numero ? encodeURIComponent(emp.numero) : null
  return [
    { href: `/plantilla/matriz/${encodeURIComponent(emp.id)}`, label: "Matriz de capacitación", icon: LayoutGrid },
    ...(numero ? [
      { href: `/plantilla/incidencias/${numero}`, label: "Incidencias", icon: CalendarClock },
      { href: `/plantilla/actas/${numero}`, label: "Actas administrativas", icon: FilePenLine },
      { href: `/plantilla/incumplimientos/${numero}`, label: "Incumplimiento", icon: ShieldAlert },
      { href: `/plantilla/retardos/${numero}`, label: "Retardos", icon: AlarmClock },
    ] : []),
  ]
}

interface CapHistorialTabProps {
  employees: Employee[]
  loadingEmployees: boolean
  canEdit: boolean
  newEmpSuccess: boolean
  addCoursesSuccess: boolean
  onNewEmployee: () => void
  onBulkImport: () => void
  onBulkImportIncumplimientos: () => void
  onBulkImportActas: () => void
  onBulkImportRetardos?: () => void
  onBulkCreateEmployees: () => void
  onEditEmployee: (emp: Employee) => void
  onAddCourses: (emp: Employee) => void
  onDeleteEmployee: (emp: Employee) => void
}

export function CapHistorialTab({
  employees, loadingEmployees, canEdit,
  newEmpSuccess, addCoursesSuccess,
  onNewEmployee, onBulkImport, onBulkImportIncumplimientos, onBulkImportActas, onBulkImportRetardos, onBulkCreateEmployees,
  onEditEmployee, onAddCourses, onDeleteEmployee,
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

  const importOptions: { label: string; icon: LucideIcon; onSelect: () => void }[] = [
    { label: "Cursos", icon: Layers, onSelect: onBulkImport },
    { label: "Empleados", icon: Users, onSelect: onBulkCreateEmployees },
    { label: "Incumplimientos", icon: ShieldAlert, onSelect: onBulkImportIncumplimientos },
    { label: "Actas", icon: FileText, onSelect: onBulkImportActas },
    ...(onBulkImportRetardos ? [{ label: "Retardos", icon: AlarmClock, onSelect: onBulkImportRetardos }] : []),
  ]

  return (
    <div className="space-y-4">
      {(newEmpSuccess || addCoursesSuccess) && (
        <Alert className="border-success/30 bg-success/10">
          <BadgeCheck className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            {newEmpSuccess ? 'Empleado registrado correctamente.' : 'Cursos guardados correctamente.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Búsqueda, filtros, acciones y página en la línea de las pestañas. */}
      <TabsToolbar>
        <SearchInput
          label="Buscar empleado"
          placeholder="Buscar empleado…"
          className={TOOLBAR_SEARCH}
          value={empSearch}
          onValueChange={setEmpSearch}
        />
        <FilterMenu
          facets={[
            { id: "departamento", label: "Departamento", value: empFilterDept, onChange: setEmpFilterDept,
              options: Object.keys(CATALOGO_ORGANIZACIONAL).map(d => ({ value: d, label: d })) },
            { id: "turno", label: "Turno", value: empFilterTurno, onChange: setEmpFilterTurno,
              options: TURNOS.map(t => ({ value: t, label: t })) },
          ]}
          onClear={() => { setEmpFilterDept(FILTER_ALL); setEmpFilterTurno(FILTER_ALL) }}
        />
        {/* Importar y crear empleados: solo quien edita Capacitación. */}
        {canEdit && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Importar
                  <ChevronDown aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Cargar información</DropdownMenuLabel>
                {importOptions.map(({ label, icon: Icon, onSelect }) => (
                  <DropdownMenuItem key={label} onSelect={onSelect}>
                    <Icon aria-hidden="true" />
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={onNewEmployee} aria-label="Nuevo empleado">
              <UserPlus aria-hidden="true" />
              <span className="hidden lg:inline">Nuevo empleado</span>
            </Button>
          </>
        )}
        <CompactPager label="Paginación de empleados" page={safePage} totalPages={totalPages} onPageChange={setEmpPage} />
      </TabsToolbar>

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
                    <span className="block truncate text-body-sm text-muted-foreground">
                      #{emp.numero ?? "—"}{emp.puesto && <span className="md:hidden"> · {emp.puesto}</span>}
                    </span>
                  </TableCell>
                  <TableCell className="hidden truncate text-body-sm text-muted-foreground md:table-cell">{emp.puesto ?? "—"}</TableCell>
                  <TableCell className="hidden truncate text-body-sm text-muted-foreground lg:table-cell">{emp.departamento ?? "—"}</TableCell>
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
                            <DropdownMenuItem onSelect={() => onAddCourses(emp)}>
                              <BookPlus aria-hidden="true" />
                              Agregar cursos
                            </DropdownMenuItem>
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
