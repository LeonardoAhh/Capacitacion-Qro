"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { CompactPager } from "@/components/ui/compact-pager"
import { SearchInput } from "@/components/ui/search-input"
import { SummaryStrip } from "@/components/ui/summary-strip"
import { TOOLBAR_SEARCH, TabsToolbar } from "@/components/ui/tabs-toolbar"
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
  onBack: () => void
  onEdit: (course: Course) => void
  isReadOnly?: boolean
}

export function CapCourseDetailView({
  course, employees, positions, positionCourses, empCourses, onBack, onEdit, isReadOnly,
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
    <motion.div
      key="detail-view"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="space-y-4"
    >
      {/* Búsqueda de empleados, edición y página en la línea de las pestañas. */}
      <TabsToolbar>
        <SearchInput
          label="Buscar empleado del curso"
          placeholder="Buscar empleado…"
          className={TOOLBAR_SEARCH}
          value={search}
          onValueChange={(value) => { setSearch(value); setPage(1) }}
        />
        {!isReadOnly && (
          <Button variant="outline" size="sm" onClick={() => onEdit(course)}>
            <Pencil aria-hidden="true" />
            Editar curso
          </Button>
        )}
        <CompactPager label="Paginación de empleados del curso" page={safePage} totalPages={totalPages} onPageChange={setPage} />
      </TabsToolbar>

      <header className="flex items-start gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 text-muted-foreground" aria-label="Volver a cursos">
          <ArrowLeft aria-hidden="true" />
        </Button>
        <div className="min-w-0">
          <h2 className="text-heading-md font-bold text-foreground">{course.name}</h2>
          <p className="text-body-sm text-muted-foreground">{courseType} · {duration}</p>
        </div>
      </header>

      <SummaryStrip items={summary} />

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed px-(--card-padding) py-12 text-center text-body-md text-muted-foreground">
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
                const calificacion = row.calificacion ?? "—"
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="block truncate text-label-sm text-foreground">{row.nombre}</span>
                      <span className="block truncate text-body-sm text-muted-foreground md:hidden">
                        {row.puesto ?? "—"}
                        <span className="sm:hidden"> · {formatDate(row.fecha)} · {calificacion}</span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden truncate text-body-sm text-muted-foreground md:table-cell">{row.puesto ?? "—"}</TableCell>
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
    </motion.div>
  )
}
