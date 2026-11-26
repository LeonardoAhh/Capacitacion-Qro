"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { CompactPager } from "@/components/ui/compact-pager"
import { HeaderSearch } from "@/components/ui/header-search"
import { Skeleton } from "@/components/ui/skeleton"
import { SummaryStrip } from "@/components/ui/summary-strip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getTipoCursoByName } from "@/lib/catalogo"
import { empleadosAsignadosAlCurso } from "@/lib/capacitacion/course-metrics"
import { formatDate } from "@/lib/hooks/useNuevoIngreso"
import { cn } from "@/lib/utils"
import type { Course, Position, PositionCourse, Employee, EmployeeCourse } from "@/lib/hooks"

const PAGE_SIZE = 10
const HEAD = "whitespace-nowrap text-eyebrow uppercase"

type Estado = ReturnType<typeof empleadosAsignadosAlCurso>[number]["estado"]

/** Etiqueta, insignia y color del resumen de cada estado, en el orden del resumen. */
const ESTADOS: { estado: Estado; label: string; plural: string; variant: NonNullable<BadgeProps["variant"]>; tone: string }[] = [
  { estado: "aprobado", label: "Aprobado", plural: "Aprobados", variant: "success", tone: "text-success" },
  { estado: "reprobado", label: "Reprobado", plural: "Reprobados", variant: "destructive", tone: "text-destructive" },
  { estado: "pendiente", label: "Pendiente", plural: "Pendientes", variant: "warning", tone: "text-warning-deep" },
]
const ESTADO_META = Object.fromEntries(ESTADOS.map(meta => [meta.estado, meta])) as Record<Estado, (typeof ESTADOS)[number]>

interface CapCourseDetailViewProps {
  course: Course
  employees: Employee[]
  positions: Position[]
  positionCourses: PositionCourse[]
  empCourses: EmployeeCourse[]
  loadingDetails?: boolean
  onBack: () => void
  onEdit: (course: Course) => void
  isReadOnly?: boolean
}

export function CapCourseDetailView({
  course, employees, positions, positionCourses, empCourses, loadingDetails = false, onBack, onEdit, isReadOnly,
}: CapCourseDetailViewProps) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const asignados = useMemo(
    () => empleadosAsignadosAlCurso(course.id, employees, positions, positionCourses, empCourses),
    [course.id, employees, positions, positionCourses, empCourses],
  )

  const term = search.toLowerCase()
  const filtered = asignados.filter(row => row.nombre.toLowerCase().includes(term) || (row.puesto ?? "").toLowerCase().includes(term))
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const total = asignados.length
  const percent = (count: number) => `${total ? Math.round((count / total) * 100) : 0}% del total`
  const summary = [
    { label: "Asignados", value: total, detail: "Según su puesto" },
    ...ESTADOS.map(({ estado, plural, tone }) => {
      const count = asignados.filter(row => row.estado === estado).length
      return { label: plural, value: count, detail: percent(count), tone }
    }),
  ]

  const courseType = course.tipo || getTipoCursoByName(course.name)
  const duration = course.duration_hours != null ? `${course.duration_hours} h` : "Sin duración"

  return (
    <div className="space-y-4">
      {/* La búsqueda vive en la lupa del header, como en el resto de /plantilla (design.md). */}
      <HeaderSearch
        label="Buscar empleado del curso"
        placeholder="Buscar empleado…"
        value={search}
        onValueChange={(value) => { setSearch(value); setPage(1) }}
      />

      {/* Una fila: volver, nombre con tipo y duración, y a la derecha edición y paginación. */}
      <header className="@container flex flex-wrap items-center gap-x-2 gap-y-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 text-muted-foreground" aria-label="Volver a cursos">
          <ArrowLeft aria-hidden="true" />
        </Button>
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3">
          <h2 className="min-w-0 max-w-full truncate text-heading-md text-foreground" title={course.name}>{course.name}</h2>
          <p className="shrink-0 text-body-sm text-muted-foreground">{courseType} · {duration}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!isReadOnly && (
            <Button variant="outline" size="sm" className="touch-target" onClick={() => onEdit(course)} aria-label="Editar curso">
              <Pencil aria-hidden="true" />
              <span className="hidden @3xl:inline">Editar curso</span>
            </Button>
          )}
          <CompactPager label="Paginación de empleados del curso" page={safePage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </header>

      <SummaryStrip items={summary} />

      {loadingDetails ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table aria-label={`Cargando empleados asignados a ${course.name}`} aria-busy="true" className="table-fixed">
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className={HEAD}>Empleado</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden md:table-cell")}>Puesto</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-28 sm:table-cell")}>Fecha</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-28 text-right sm:table-cell")}>Calificación</TableHead>
                <TableHead scope="col" className={cn(HEAD, "w-28")}>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }, (_, index) => (
                <TableRow key={index} aria-hidden="true" className="hover:bg-transparent">
                  <TableCell><Skeleton className="h-4 w-48 max-w-full" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-3.5 w-36 max-w-full" /></TableCell>
                  <TableCell className="hidden w-28 sm:table-cell"><Skeleton className="h-3.5 w-20" /></TableCell>
                  <TableCell className="hidden w-28 sm:table-cell"><Skeleton className="ml-auto h-3.5 w-8" /></TableCell>
                  <TableCell className="w-28"><Skeleton className="h-6 w-20 rounded-md" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed px-(--card-padding) py-10 text-center text-body-md text-muted-foreground">
          {total === 0 ? "Ningún empleado tiene este curso asignado." : "No se encontraron empleados con esa búsqueda."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table className="table-fixed">
            <caption className="sr-only">Empleados asignados a {course.name}</caption>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className={HEAD}>Empleado</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden md:table-cell")}>Puesto</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-28 sm:table-cell")}>Fecha</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-28 text-right sm:table-cell")}>Calificación</TableHead>
                <TableHead scope="col" className={cn(HEAD, "w-28")}>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(row => {
                const meta = ESTADO_META[row.estado]
                const calificacion = row.calificacion ?? "-"
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="block truncate text-label-sm text-foreground">{row.nombre}</span>
                      <span className="block truncate text-body-sm text-muted-foreground md:hidden">
                        {row.puesto ?? "-"}
                        <span className="sm:hidden"> · {formatDate(row.fecha)} · {calificacion}</span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden truncate text-body-sm text-muted-foreground md:table-cell">{row.puesto ?? "-"}</TableCell>
                    <TableCell className="hidden text-body-sm tabular-nums text-muted-foreground sm:table-cell">{formatDate(row.fecha)}</TableCell>
                    <TableCell className="hidden text-right text-body-sm tabular-nums text-foreground sm:table-cell">{calificacion}</TableCell>
                    <TableCell><Badge variant={meta.variant} size="sm">{meta.label}</Badge></TableCell>
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
