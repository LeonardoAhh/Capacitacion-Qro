"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Check, ChevronsUpDown, Download, Search, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { isoATexto } from "@/lib/fechas"
import type { Course, Employee, EmployeeCourse } from "@/lib/hooks"
import { normalizeCourseName } from "@/lib/hooks/useCapacitacion"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"

interface CapCourseItDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courses: Course[]
  employees: Employee[]
  empCourses: EmployeeCourse[]
}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").replace(/\s+/g, " ").trim()
  return cleaned || "curso"
}

function normalizeIsoDate(value: string | null | undefined): string | null {
  if (!value) return null
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim())
  return match ? match[1] : null
}

function parseIsoToUtcDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function compareNumero(a: string, b: string): number {
  const numA = Number(a)
  const numB = Number(b)
  if (Number.isFinite(numA) && Number.isFinite(numB) && numA !== numB) return numA - numB
  return a.localeCompare(b, "es-MX", { numeric: true })
}

/**
 * Exporta los registros de un curso y una fecha de aplicación específicos en el formato
 * requerido por la plataforma de IT: NoEmpleado, Nombre (del curso), FechaAplicacion y Calificacion.
 */
export function CapCourseItDialog({ open, onOpenChange, courses, employees, empCourses }: CapCourseItDialogProps) {
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [pickerOpen, setPickerOpen] = useState(false)
  const [courseSearch, setCourseSearch] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const dateFieldId = useId()

  useEffect(() => {
    if (!open) {
      setPickerOpen(false)
      setCourseSearch("")
    }
  }, [open])

  useEffect(() => {
    if (!pickerOpen) return
    const frame = requestAnimationFrame(() => searchRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [pickerOpen])

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.name.localeCompare(b.name, "es-MX")),
    [courses],
  )

  const visibleCourses = useMemo(() => {
    const query = normalizeCourseName(courseSearch)
    const matching = query
      ? sortedCourses.filter(course => normalizeCourseName(course.name).includes(query))
      : sortedCourses
    return matching.slice(0, 50)
  }, [courseSearch, sortedCourses])

  const employeeById = useMemo(() => new Map(employees.map(employee => [employee.id, employee])), [employees])
  const selectedCourse = useMemo(() => courses.find(c => c.id === selectedCourseId) ?? null, [courses, selectedCourseId])

  const courseRecords = useMemo(() => {
    if (!selectedCourse) return []
    const courseNorm = normalizeCourseName(selectedCourse.name)
    return empCourses.filter(ec => {
      if (ec.course_id === selectedCourse.id) return true
      const ecNorm = normalizeCourseName(ec.course?.name ?? ec.raw_course_name ?? "")
      return Boolean(ecNorm) && ecNorm === courseNorm
    })
  }, [selectedCourse, empCourses])

  // Fechas reales en que se tomó el curso (más reciente primero), contando empleados con número.
  const availableDates = useMemo(() => {
    const byDate = new Map<string, Set<string>>()
    for (const record of courseRecords) {
      const iso = normalizeIsoDate(record.fecha_aplicacion)
      const numero = employeeById.get(record.employee_id)?.numero?.trim()
      if (!iso || !numero) continue
      const set = byDate.get(iso) ?? new Set<string>()
      set.add(numero)
      byDate.set(iso, set)
    }
    return [...byDate.entries()]
      .map(([iso, numeros]) => ({ iso, label: isoATexto(iso), count: numeros.size }))
      .sort((a, b) => b.iso.localeCompare(a.iso))
  }, [courseRecords, employeeById])

  // Si cambia el curso o la fecha elegida ya no existe en él, selecciona la más reciente.
  const activeDate = useMemo(() => {
    if (availableDates.some(item => item.iso === selectedDate)) return selectedDate
    return availableDates[0]?.iso ?? ""
  }, [availableDates, selectedDate])

  const exportRows = useMemo(() => {
    if (!selectedCourse || !activeDate) return []
    const byNumero = new Map<string, { numero: string; fecha: string; calificacion: number | null }>()
    for (const record of courseRecords) {
      const iso = normalizeIsoDate(record.fecha_aplicacion)
      if (iso !== activeDate) continue
      const numero = employeeById.get(record.employee_id)?.numero?.trim()
      if (!numero) continue
      byNumero.set(numero, {
        numero,
        fecha: iso,
        calificacion: record.calificacion ?? null,
      })
    }
    return [...byNumero.values()].sort((a, b) => compareNumero(a.numero, b.numero))
  }, [selectedCourse, activeDate, courseRecords, employeeById])

  const handleClose = () => {
    if (!isExporting) onOpenChange(false)
  }

  const pickCourse = (courseId: string) => {
    setSelectedCourseId(courseId)
    setSelectedDate("")
    setPickerOpen(false)
    setCourseSearch("")
  }

  const handleExport = async () => {
    if (!selectedCourse || !activeDate || exportRows.length === 0 || isExporting) return
    setIsExporting(true)

    try {
      const ExcelJS = await import("exceljs")
      // @ts-expect-error file-saver no incluye declaraciones de tipos en este proyecto
      const { saveAs } = await import("file-saver")
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet("Cursos")

      sheet.columns = [
        { header: "NoEmpleado", key: "noEmpleado", width: 15 },
        { header: "Nombre", key: "nombre", width: 38 },
        { header: "FechaAplicacion", key: "fechaAplicacion", width: 18 },
        { header: "Calificacion", key: "calificacion", width: 14 },
      ]

      for (const row of exportRows) {
        const parsedNo = /^\d+$/.test(row.numero) ? Number(row.numero) : row.numero
        const added = sheet.addRow({
          noEmpleado: parsedNo,
          nombre: selectedCourse.name,
          fechaAplicacion: parseIsoToUtcDate(row.fecha),
          calificacion: row.calificacion ?? "",
        })
        added.getCell("fechaAplicacion").numFmt = "dd/mm/yyyy"
      }

      const headerRow = sheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: "FF000000" }, name: "Arial", size: 11 }
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92D050" } }
      headerRow.alignment = { vertical: "middle", horizontal: "center" }

      const buffer = await workbook.xlsx.writeBuffer()
      saveAs(new Blob([buffer]), `${sanitizeFileName(selectedCourse.name)}.xlsx`)
      notify.success(`Excel descargado (${exportRows.length.toLocaleString("es-MX")} registros)`)
      onOpenChange(false)
    } catch (caught) {
      console.error("Error al exportar formato IT:", caught)
      notify.error("No se pudo descargar el Excel")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <ResponsiveShell
      open={open}
      onClose={handleClose}
      size="sm"
      title="Exportar formato IT"
      description="Descarga en Excel los registros del curso y fecha seleccionados con el formato para la plataforma de IT."
    >
      <ModalHeader title="Exportar formato IT" onClose={handleClose} />

      <div className="space-y-4 overflow-y-auto bg-card px-4 py-4 sm:px-6">
        <p className="text-body-sm text-muted-foreground">
          Columnas: NoEmpleado, Nombre, FechaAplicacion y Calificacion.
        </p>

        <div className="space-y-2">
          <Label htmlFor="it-course-picker">Curso</Label>
          <Popover
            modal
            open={pickerOpen}
            onOpenChange={nextOpen => {
              setPickerOpen(nextOpen)
              if (!nextOpen) setCourseSearch("")
            }}
          >
            <PopoverTrigger asChild>
              <Button
                id="it-course-picker"
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={pickerOpen}
                aria-controls={listId}
                disabled={isExporting}
                className="h-(--control-height) w-full min-w-0 justify-between bg-card px-3 text-body-md font-normal shadow-none hover:bg-accent/60"
              >
                <span className={cn("min-w-0 truncate text-left", !selectedCourse && "text-muted-foreground")}>
                  {selectedCourse?.name || "Selecciona un curso…"}
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
                  ref={searchRef}
                  value={courseSearch}
                  onChange={event => setCourseSearch(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Enter" && visibleCourses.length > 0) {
                      event.preventDefault()
                      pickCourse(visibleCourses[0].id)
                    }
                  }}
                  aria-label="Buscar curso"
                  placeholder="Buscar curso…"
                  className="h-(--control-height-sm) pl-9"
                />
              </div>
              <div id={listId} role="listbox" className="max-h-60 overflow-y-auto overscroll-contain p-1">
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
                        onClick={() => pickCourse(course.id)}
                        className="flex min-h-(--menu-item-height) w-full min-w-0 cursor-pointer items-center gap-2 rounded-sm px-2.5 text-left text-body-md transition-colors hover:bg-accent focus-visible:bg-accent"
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

        {selectedCourse && (
          <div className="space-y-2">
            <Label htmlFor={dateFieldId}>Fecha de aplicación</Label>
            <Select
              value={activeDate}
              onValueChange={setSelectedDate}
              disabled={isExporting || availableDates.length === 0}
            >
              <SelectTrigger id={dateFieldId} className="w-full tabular-nums">
                <SelectValue placeholder="Sin fechas registradas" />
              </SelectTrigger>
              <SelectContent matchTriggerWidth className="max-h-60">
                {availableDates.map(item => (
                  <SelectItem key={item.iso} value={item.iso}>
                    {item.label} ({item.count} {item.count === 1 ? "empleado" : "empleados"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedCourse && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-4 py-3">
            <span className="flex min-w-0 items-center gap-2 text-label-sm text-foreground">
              <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{selectedCourse.name}</span>
            </span>
            <span className="shrink-0 text-body-sm tabular-nums text-muted-foreground">
              {exportRows.length === 0
                ? "Sin registros"
                : `${exportRows.length.toLocaleString("es-MX")} ${exportRows.length === 1 ? "registro" : "registros"}`}
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
        confirmDisabled={exportRows.length === 0}
      />
    </ResponsiveShell>
  )
}
