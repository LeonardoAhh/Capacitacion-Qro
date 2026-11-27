"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronsUpDown, Download, Search, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import type { Course, Employee, EmployeeCourse } from "@/lib/hooks"
import { getLatestEmployeeCourseAttempts, normalizeCourseName } from "@/lib/hooks/useCapacitacion"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"

interface CapCourseAuditDialogProps {
  open: boolean
  onOpenChange: (val: boolean) => void
  courses: Course[]
  employees: Employee[]
  empCourses: EmployeeCourse[]
}

function courseStatus(cal: number | null) {
  if (cal == null) return "pendiente"
  return cal >= 7 ? "aprobado" : "reprobado"
}

export function CapCourseAuditDialog({ open, onOpenChange, courses, employees, empCourses }: CapCourseAuditDialogProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [coursePickerOpen, setCoursePickerOpen] = useState(false)
  const [courseSearch, setCourseSearch] = useState("")
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (!open) {
      setCoursePickerOpen(false)
      setCourseSearch("")
    }
  }, [open])

  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) => a.name.localeCompare(b.name, "es-MX"))
  }, [courses])

  // Montar cientos de opciones a la vez hacía lento el click del selector.
  // El buscador muestra un máximo de 50 coincidencias por interacción.
  const visibleCourses = useMemo(() => {
    const query = normalizeCourseName(courseSearch)
    const matching = query
      ? sortedCourses.filter(course => normalizeCourseName(course.name).includes(query))
      : sortedCourses
    return matching.slice(0, 50)
  }, [courseSearch, sortedCourses])

  const latestEmpCourses = useMemo(
    () => getLatestEmployeeCourseAttempts(empCourses),
    [empCourses]
  )

  const employeeById = useMemo(
    () => new Map(employees.map(employee => [employee.id, employee])),
    [employees]
  )

  // Una sola fila por empleado: siempre el intento más reciente del curso.
  const auditData = useMemo(() => {
    if (!selectedCourseId) return []

    const selectedCourse = courses.find(c => c.id === selectedCourseId)
    if (!selectedCourse) return []

    const courseNorm = normalizeCourseName(selectedCourse.name)

    const matchingRecords = latestEmpCourses.filter(ec => {
      if (ec.course_id === selectedCourse.id) return true
      const ecNorm = normalizeCourseName(ec.course?.name ?? ec.raw_course_name ?? "")
      if (!ecNorm) return false
      return ecNorm === courseNorm
    })

    const results = matchingRecords.map(record => {
      const emp = employeeById.get(record.employee_id)
      const calificacion = record.calificacion ?? null
      const fecha = record.fecha_aplicacion ?? null

      return {
        empleadoId: record.employee_id,
        nombre: emp?.nombre || "Empleado desconocido",
        puesto: emp?.puesto || "-",
        numero: emp?.numero || "-",
        calificacion,
        fecha,
        estado: courseStatus(calificacion),
      }
    })

    return results.sort((a, b) => a.nombre.localeCompare(b.nombre, "es-MX"))
  }, [selectedCourseId, courses, latestEmpCourses, employeeById])

  const selectedCourseName = useMemo(() => {
    return courses.find(c => c.id === selectedCourseId)?.name || ""
  }, [courses, selectedCourseId])

  const handleClose = () => {
    if (!isExporting) onOpenChange(false)
  }

  const handleExport = async () => {
    if (auditData.length === 0 || isExporting) return
    setIsExporting(true)

    try {
      const ExcelJS = await import("exceljs")
      // @ts-expect-error file-saver no incluye declaraciones de tipos en este proyecto
      const { saveAs } = await import("file-saver")
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet("Auditoría")

      sheet.columns = [
        { header: "Número empleado", key: "numero", width: 18 },
        { header: "Nombre", key: "nombre", width: 35 },
        { header: "Puesto", key: "puesto", width: 30 },
        { header: "Curso Evaluado", key: "curso", width: 40 },
        { header: "Fecha Aplicación", key: "fecha", width: 18 },
        { header: "Calificación", key: "calif", width: 15 },
        { header: "Estado", key: "estado", width: 15 },
      ]

      auditData.forEach(row => {
        sheet.addRow({
          numero: row.numero,
          nombre: row.nombre,
          puesto: row.puesto,
          curso: selectedCourseName,
          fecha: row.fecha ? row.fecha.split("-").reverse().join("/") : "-",
          calif: row.calificacion != null ? String(row.calificacion) : "-",
          estado: row.estado.toUpperCase(),
        })
      })

      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial", size: 11 }
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF18181B" } }
      sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" }

      const buffer = await workbook.xlsx.writeBuffer()
      const today = new Date().toISOString().slice(0, 10)
      const slug = normalizeCourseName(selectedCourseName).toLowerCase().replace(/\s+/g, "-") || "curso"
      saveAs(new Blob([buffer]), `auditoria-${slug}-${today}.xlsx`)
      notify.success(`Auditoría descargada (${auditData.length.toLocaleString("es-MX")} registros)`)
      onOpenChange(false)
    } catch (e) {
      console.error("Error al exportar auditoría:", e)
      notify.error("No se pudo descargar la auditoría")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <ResponsiveShell
      open={open}
      onClose={handleClose}
      size="sm"
      title="Auditoría de curso"
      description="Exporta en Excel el intento más reciente de cada empleado en el curso seleccionado."
    >
      <ModalHeader
        title="Auditoría de curso"
        onClose={handleClose}
      />

      <div className="space-y-4 overflow-y-auto bg-card px-4 py-4 sm:px-6">
        <p className="text-body-md text-muted-foreground">
          Último intento por empleado del curso seleccionado.
        </p>

        <div className="space-y-2">
          <Label htmlFor="audit-course-picker">Curso</Label>
          <Popover
            modal
            open={coursePickerOpen}
            onOpenChange={nextOpen => {
              setCoursePickerOpen(nextOpen)
              if (!nextOpen) setCourseSearch("")
            }}
          >
            <PopoverTrigger asChild>
              <Button
                id="audit-course-picker"
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={coursePickerOpen}
                aria-controls="audit-course-listbox"
                disabled={isExporting}
                className="h-(--control-height) w-full min-w-0 justify-between bg-transparent px-3 text-body-md font-normal shadow-none"
              >
                <span className={cn("min-w-0 truncate text-left", !selectedCourseName && "text-muted-foreground")}>
                  {selectedCourseName || "Selecciona un curso…"}
                </span>
                <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="bottom"
              className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden p-0"
            >
              <div className="relative border-b border-border/60 p-2">
                <Search className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={courseSearch}
                  onChange={event => setCourseSearch(event.target.value)}
                  aria-label="Buscar curso"
                  placeholder="Buscar curso…"
                  className="h-(--control-height-sm) pl-9"
                />
              </div>
              <div id="audit-course-listbox" role="listbox" className="max-h-60 overflow-y-auto overscroll-contain p-1">
                {visibleCourses.length === 0 ? (
                  <p className="px-3 py-6 text-center text-body-sm text-muted-foreground">No se encontraron cursos.</p>
                ) : (
                  visibleCourses.map(course => {
                    const isSelected = selectedCourseId === course.id
                    return (
                      <button
                        key={course.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        title={course.name}
                        onClick={() => {
                          setSelectedCourseId(course.id)
                          setCoursePickerOpen(false)
                          setCourseSearch("")
                        }}
                        className="flex min-h-(--menu-item-height) w-full min-w-0 items-center gap-2 rounded-sm px-2.5 text-left text-body-md outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
                      >
                        <Check
                          className={cn("size-4 shrink-0 text-primary", isSelected ? "opacity-100" : "opacity-0")}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate">{course.name}</span>
                      </button>
                    )
                  })
                )}
                {sortedCourses.length > visibleCourses.length && !courseSearch && (
                  <p className="px-3 py-2 text-center text-body-sm text-muted-foreground">
                    Escribe para buscar en los {sortedCourses.length.toLocaleString("es-MX")} cursos.
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {selectedCourseId && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <span className="flex min-w-0 items-center gap-2 text-label-sm text-foreground">
              <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{selectedCourseName}</span>
            </span>
            <span className="shrink-0 text-body-sm tabular-nums text-muted-foreground">
              {auditData.length === 0
                ? "Sin registros"
                : `${auditData.length.toLocaleString("es-MX")} registro${auditData.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        )}
      </div>

      <ModalFooter
        onCancel={handleClose}
        cancelLabel="Cancelar"
        onConfirm={handleExport}
        saving={isExporting}
        confirmLabel="Descargar Excel"
        confirmIcon={<Download className="size-4" aria-hidden="true" />}
        confirmDisabled={auditData.length === 0}
      />
    </ResponsiveShell>
  )
}
