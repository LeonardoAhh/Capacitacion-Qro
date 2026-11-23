"use client"
import { useState, useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { TOOLBAR_SEARCH, TabsToolbar } from "@/components/ui/tabs-toolbar"
import { CompactPager } from "@/components/ui/compact-pager"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { downloadExcelReport } from "@/lib/capacitacion/excel"
import { CapReportPreviewDialog } from "@/components/content/cap-report-preview-dialog"
import { CapCourseAuditDialog } from "@/components/content/cap-course-audit-dialog"
import { CapCourseDetailView } from "@/components/content/cap-course-detail-view"
import { motion, AnimatePresence } from "framer-motion"
import type { Course, Position, PositionCourse, Employee, EmployeeCourse } from "@/lib/hooks"

const PAGE_SIZE = 12
const HEAD = "whitespace-nowrap text-eyebrow uppercase"

interface CapCoursesTabProps {
  courses: Course[]
  loadingCourses: boolean
  isReadOnly: boolean
  positions: Position[]
  positionCourses: PositionCourse[]
  employees: Employee[]
  empCourses: EmployeeCourse[]
  onNewCourse: () => void
  onEditCourse: (course: Course) => void
}

export function CapCoursesTab({
  courses, loadingCourses, isReadOnly, positions, positionCourses, employees, empCourses, onNewCourse, onEditCourse,
}: CapCoursesTabProps) {
  const [courseSearch, setCourseSearch] = useState("")
  const [coursePage, setCoursePage] = useState(1)

  const filtered = courses.filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase()))
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(coursePage, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  const handleDownload = async () => {
    await downloadExcelReport({ courses, positions, positionCourses, employees, empCourses })
  }

  const selectedCourse = useMemo(() => {
    return courses.find(c => c.id === selectedCourseId) || null
  }, [courses, selectedCourseId])

  return (
    <div className="space-y-4">
      {/* Búsqueda y acciones en la línea de las pestañas; "Nuevo curso" es la acción principal. */}
      <TabsToolbar>
        <SearchInput
          label="Buscar curso"
          placeholder="Buscar curso…"
          className={TOOLBAR_SEARCH}
          value={courseSearch}
          onValueChange={(value) => { setCourseSearch(value); setCoursePage(1) }}
        />
        <Button variant="outline" size="sm" onClick={() => setAuditOpen(true)} aria-label="Auditoría global">
          Auditoría
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} aria-label="Descargar reporte Excel">
          Reporte
        </Button>
        {!isReadOnly && (
          <Button size="sm" onClick={onNewCourse}>Nuevo curso</Button>
        )}
        {!selectedCourse && <CompactPager label="Paginación de cursos" page={safePage} totalPages={totalPages} onPageChange={setCoursePage} />}
      </TabsToolbar>

      {loadingCourses ? (
        <div className="space-y-2" role="status" aria-label="Cargando cursos">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-(--control-height) w-full" />)}
        </div>
      ) : (
        <div className="relative">
          <AnimatePresence mode="wait">
            {selectedCourse ? (
              <CapCourseDetailView
                key="detail"
                course={selectedCourse}
                employees={employees}
                positions={positions}
                positionCourses={positionCourses}
                empCourses={empCourses}
                onBack={() => setSelectedCourseId(null)}
                onEdit={onEditCourse}
                isReadOnly={isReadOnly}
              />
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="w-full"
              >
                {filtered.length === 0 ? (
                  <p className="rounded-xl border border-dashed px-(--card-padding) py-12 text-center text-body-md text-muted-foreground">
                    {courses.length === 0
                      ? "No hay cursos registrados. Importa datos primero."
                      : "No se encontraron cursos."}
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-xl border bg-card">
                    <Table className="table-fixed">
                      <caption className="sr-only">Cursos; abre uno para ver su detalle</caption>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead scope="col" className={HEAD}>Curso</TableHead>
                          <TableHead scope="col" className={cn(HEAD, "hidden w-40 sm:table-cell")}>Tipo</TableHead>
                          <TableHead scope="col" className={cn(HEAD, "hidden w-24 text-right md:table-cell")}>Duración</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginated.map(course => (
                          <TableRow key={course.id} className="cursor-pointer" onClick={() => setSelectedCourseId(course.id)}>
                            <TableCell>
                              <button type="button" onClick={event => { event.stopPropagation(); setSelectedCourseId(course.id) }}
                                className="block w-full truncate rounded-sm text-left text-label-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                                {course.name}
                              </button>
                              {course.tipo && <span className="block truncate text-body-sm text-muted-foreground sm:hidden">{course.tipo}</span>}
                            </TableCell>
                            <TableCell className="hidden truncate text-body-sm text-muted-foreground sm:table-cell">{course.tipo ?? "—"}</TableCell>
                            <TableCell className="hidden text-right text-body-sm tabular-nums text-muted-foreground md:table-cell">
                              {course.duration_hours != null ? `${course.duration_hours} h` : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <CapReportPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onDownload={handleDownload}
      />

      <CapCourseAuditDialog
        open={auditOpen}
        onOpenChange={setAuditOpen}
        courses={courses}
        employees={employees}
        empCourses={empCourses}
      />
    </div>
  )
}
