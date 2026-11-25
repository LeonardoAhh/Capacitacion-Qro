"use client"

import { useState, useEffect, useMemo } from "react"
import { FileText, Loader2 } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

import { useCapacitacion } from "@/lib/hooks"
import type { Employee } from "@/lib/hooks"
import { getTipoCursoByName } from "@/lib/catalogo"
import { notify } from "@/lib/notify"
import { addReportFooter } from "@/lib/pdf-footer"
import { PRINT_FONT_FAMILY, registerPrintFont } from "@/lib/print-font"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { CompactPager } from "@/components/ui/compact-pager"
import { HeaderSearch } from "@/components/ui/header-search"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

// 9 filas de dos líneas caben con la barra superior en una pantalla de escritorio sin scroll.
const PAGE_SIZE = 9
const HEAD = "whitespace-nowrap text-eyebrow uppercase"

export default function ReportesContent() {
  const { fetchEmployees, fetchEmployeeProgress } = useCapacitacion()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    loadEmployees()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadEmployees = async () => {
    setLoading(true)
    try {
      const data = await fetchEmployees()
      setEmployees(data)
    } catch (err) {
      console.error(err)
      notify.error("Error al cargar empleados")
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (!search) return employees
    const s = search.toLowerCase()
    return employees.filter(e => 
      e.nombre.toLowerCase().includes(s) || 
      (e.numero && e.numero.toLowerCase().includes(s)) ||
      (e.puesto && e.puesto.toLowerCase().includes(s))
    )
  }, [employees, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const allSelected = filtered.length > 0 && selected.size === filtered.length

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const toggleSelectAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(e => e.id)))
    }
  }

  const handleDownload = async () => {
    if (selected.size === 0) return
    setGenerating(true)
    try {
      const doc = new jsPDF()
      await registerPrintFont(doc)
      const selectedIds = Array.from(selected)
      
      for (let i = 0; i < selectedIds.length; i++) {
        const empId = selectedIds[i]
        const emp = employees.find(e => e.id === empId)
        if (!emp) continue

        if (i > 0) doc.addPage()

        const progress = await fetchEmployeeProgress(emp)

        // Banner Header
        doc.setFillColor(30, 41, 59) // slate-800
        doc.rect(0, 0, 210, 24, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(16)
        doc.setFont(PRINT_FONT_FAMILY, "bold")
        doc.text("Reporte de Capacitación", 14, 15)
        
        // Employee info
        doc.setTextColor(15, 23, 42) // slate-900
        doc.setFontSize(18)
        doc.setFont(PRINT_FONT_FAMILY, "bold")
        doc.text(emp.nombre, 14, 38)
        
        doc.setFontSize(11)
        doc.setFont(PRINT_FONT_FAMILY, "normal")
        doc.setTextColor(71, 85, 105) // slate-500
        doc.text(`Nº Empleado: ${emp.numero || "N/A"}`, 14, 46)
        doc.text(`Puesto: ${emp.puesto || "N/A"}`, 14, 52)
        doc.text(`Departamento: ${emp.departamento || "N/A"}`, 14, 58)
        
        // Progress Summary
        doc.setFillColor(241, 245, 249) // slate-100
        doc.rect(14, 66, 182, 14, "F")
        doc.setTextColor(15, 23, 42)
        doc.setFontSize(10)
        doc.setFont(PRINT_FONT_FAMILY, "bold")
        doc.text(`Requeridos: ${progress.totalRequired}`, 20, 75)
        doc.setTextColor(22, 163, 74) // green-600
        doc.text(`Aprobados: ${progress.aprobados}`, 65, 75)
        doc.setTextColor(220, 38, 38) // red-600
        doc.text(`Reprobados: ${progress.reprobados}`, 115, 75)
        doc.setTextColor(234, 88, 12) // orange-600
        doc.text(`Pendientes: ${progress.pendientes}`, 165, 75)

        // Group courses by type
        const byType: Record<string, typeof progress.courses> = {}
        progress.courses.forEach(c => {
          const t = c.course?.tipo || getTipoCursoByName(c.courseName)
          if (!byType[t]) byType[t] = []
          byType[t].push(c)
        })

        let startY = 88
        
        Object.keys(byType).sort().forEach(tipo => {
          doc.setFontSize(12)
          doc.setFont(PRINT_FONT_FAMILY, "bold")
          doc.setTextColor(30, 41, 59)
          doc.text(tipo.toUpperCase(), 14, startY)
          
          const tableData = byType[tipo].map(c => [
            c.courseName,
            c.status === "aprobado" ? "Aprobado" : c.status === "reprobado" ? "Reprobado" : "Pendiente",
            c.calificacion !== null ? c.calificacion.toString() : "-",
            c.fechaAplicacion ? new Date(c.fechaAplicacion).toLocaleDateString("es-MX", { timeZone: 'UTC' }) : "-"
          ])

          autoTable(doc, {
            startY: startY + 4,
            head: [["Curso", "Estatus", "Calificación", "Fecha Aplicación"]],
            body: tableData,
            theme: "grid",
            headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
            styles: { font: PRINT_FONT_FAMILY, fontSize: 9, cellPadding: 4 },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            margin: { left: 14, right: 14 },
            columnStyles: {
              0: { cellWidth: 90 },
              1: { cellWidth: 30 },
              2: { cellWidth: 28, halign: "center" },
              3: { cellWidth: 34, halign: "center" }
            },
            willDrawCell: function(data: any) {
              if (data.section === 'body' && data.column.index === 1) {
                if (data.cell.raw === 'Aprobado') {
                  data.cell.styles.textColor = [22, 163, 74] // green
                } else if (data.cell.raw === 'Reprobado') {
                  data.cell.styles.textColor = [220, 38, 38] // red
                } else {
                  data.cell.styles.textColor = [234, 88, 12] // orange
                }
                data.cell.styles.fontStyle = 'bold'
              }
            }
          })
          
          startY = (doc as any).lastAutoTable.finalY + 12
        })
      }
      
      addReportFooter(doc)
      const fileName = `Reporte_Capacitacion_${new Date().toISOString().split("T")[0]}.pdf`
      doc.save(fileName)
      notify.success("Reporte generado exitosamente")
    } catch (err) {
      console.error(err)
      notify.error("Error al generar el reporte")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* La búsqueda va en el header. Barra: descarga a la izquierda; selección y página a la derecha. */}
      <HeaderSearch value={search} onValueChange={value => { setSearch(value); setPage(1) }}
        label="Buscar por nombre, número o puesto" placeholder="Buscar por nombre, número o puesto…" />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleDownload} disabled={selected.size === 0 || generating}>
          {generating ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <FileText aria-hidden="true" />}
          {generating ? "Generando PDF…" : "Descargar PDF"}
        </Button>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {filtered.length > 0 && (
            <label className="flex min-h-(--control-height) cursor-pointer items-center gap-2 whitespace-nowrap rounded-md px-2 text-body-md text-foreground">
              <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Seleccionar todos los colaboradores" />
              <span aria-live="polite">{selected.size > 0 ? `${selected.size} seleccionados` : "Seleccionar todos"}</span>
            </label>
          )}
          <CompactPager label="Paginación de colaboradores" page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2" aria-label="Cargando colaboradores">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-(--control-height) w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed px-(--card-padding) py-12 text-center text-body-md text-muted-foreground">
          No se encontraron colaboradores.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table className="table-fixed">
            <caption className="sr-only">Colaboradores para el reporte de capacitación</caption>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 px-1"><span className="sr-only">Seleccionar</span></TableHead>
                <TableHead scope="col" className={HEAD}>Colaborador</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-56 md:table-cell")}>Departamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map(emp => {
                const isSelected = selected.has(emp.id)
                return (
                  <TableRow key={emp.id} data-state={isSelected ? "selected" : undefined} className="cursor-pointer" onClick={() => toggleSelect(emp.id)}>
                    <TableCell className="px-1 text-center" onClick={event => event.stopPropagation()}>
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(emp.id)} aria-label={`Seleccionar a ${emp.nombre}`} />
                    </TableCell>
                    <TableCell>
                      <span className="block truncate text-label-sm text-foreground">{emp.nombre}</span>
                      <span className="block truncate text-body-sm text-muted-foreground">
                        {[`#${emp.numero || "—"}`, emp.puesto].filter(Boolean).join(" · ")}
                      </span>
                    </TableCell>
                    <TableCell className="hidden truncate text-body-sm text-muted-foreground md:table-cell">{emp.departamento || "—"}</TableCell>
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
