"use client"
import { useState, useMemo } from "react"
import { BookOpen } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { TOOLBAR_SEARCH, TabsToolbar } from "@/components/ui/tabs-toolbar"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { downloadExcelReport } from "@/lib/capacitacion/excel"
import { CapReportPreviewDialog } from "@/components/content/cap-report-preview-dialog"
import { CapCourseAuditDialog } from "@/components/content/cap-course-audit-dialog"
import { CapCourseDetailView } from "@/components/content/cap-course-detail-view"
import { motion, AnimatePresence } from "framer-motion"
import type { Course, Position, PositionCourse, Employee, EmployeeCourse } from "@/lib/hooks"

const PAGE_SIZE = 18

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
        <Button variant="outline" onClick={() => setAuditOpen(true)} aria-label="Auditoría global">
          Auditoría
        </Button>
        <Button variant="outline" onClick={() => setPreviewOpen(true)} aria-label="Descargar reporte Excel">
          Reporte
        </Button>
        {!isReadOnly && (
          <Button onClick={onNewCourse}>Nuevo curso</Button>
        )}
      </TabsToolbar>

      {loadingCourses ? (
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-md border border-border/60 bg-transparent px-4 py-3 flex items-center gap-3 shadow-none">
              <Skeleton className="h-4 w-4 rounded bg-muted" />
              <Skeleton className="h-4 flex-1 bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <div className="relative min-h-[400px]">
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
                  <div className="text-center py-12 text-muted-foreground">
                    {courses.length === 0
                      ? "No hay cursos registrados. Importa datos primero."
                      : "No se encontraron cursos."}
                  </div>
                ) : (
                  <>
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {paginated.map((course) => (
                        <button
                          type="button"
                          key={course.id}
                          className="flex min-h-(--control-height) w-full items-center gap-3 rounded-md border border-border bg-card px-3 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setSelectedCourseId(course.id)}
                        >
                          <BookOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="min-w-0 flex-1 line-clamp-2 font-medium leading-5 text-foreground">
                            {course.name}
                          </span>
                        </button>
                      ))}
                    </div>

                    {filtered.length > PAGE_SIZE && (
                      <div className="mt-4 flex justify-end">
                        <PaginationBar currentPage={safePage} totalPages={totalPages} onPageChange={setCoursePage} />
                      </div>
                    )}
                  </>
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
