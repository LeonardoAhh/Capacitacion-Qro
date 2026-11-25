"use client"

import React, { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  ChartNoAxesColumnIncreasing,
  Download,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { notify } from "@/lib/notify"
import { exportPromocionesPDF, exportPromocionesExcel } from "@/lib/promociones/export"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { useRole } from "@/lib/hooks"
import { CompactPager } from "@/components/ui/compact-pager"
import { HeaderSearch } from "@/components/ui/header-search"
import type { ConfirmarPromocionInput, EmpleadoPromocion, ExamenPromocionInput } from "@/lib/promociones/types"
import { PROMOTION_ICON } from "@/lib/promociones/icon-styles"

import {
  isHabilitado,
  calcularAptitud,
} from "@/lib/promociones/utils"
import { PromDesempenoDialog } from "./prom-desempeno-dialog"
import { PromPromoverDialog } from "./prom-promover-dialog"
import { PromExamDialog } from "./prom-exam-dialog"
import { PromReglasPreview, PromDatosPreview } from "./prom-import-tab"
import { usePromocionesImport } from "@/lib/hooks/usePromocionesImport"
import { PromotionTable } from "./prom-table-rows"

// Re-export types for backward compat (page.tsx may import from here)
export type { AptitudStatus, CursoRequerido, ReglaPromocion, EvaluacionDesempeño, EmpleadoPromocion } from "@/lib/promociones/types"

const PAGE_SIZE = 9

const ESTADOS_FILTRO = [
  { value: "apto", label: "Apto" },
  { value: "no_apto", label: "No Apto" },
  { value: "pendiente", label: "Espera" },
  { value: "pendiente_examen", label: "Examen" },
  { value: "en_revision", label: "Revisión" },
  { value: "bloqueado_examen", label: "Penalizado" },
]

export default function PromocionesContent({
  empleados,
  onDatosActualizados,
  guardarDesempeño,
  promoverEmpleado,
  guardarExamen,
}: {
  empleados: EmpleadoPromocion[]
  onDatosActualizados?: () => void
  guardarDesempeño: (numero: string, calificacion: number, periodo?: string) => Promise<void>
  promoverEmpleado: (empleadoId: string, numero: string | undefined, nuevoPuesto: string, datos: ConfirmarPromocionInput) => Promise<void>
  guardarExamen: (numero: string, datos: ExamenPromocionInput) => Promise<void>
}) {
  const { isReadOnly } = useRole()
  const [busqueda, setBusqueda] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("todos")
  const [pagina, setPagina] = useState(1)
  const [empleadoPromover, setEmpleadoPromover] = useState<EmpleadoPromocion | null>(null)
  const [empleadoExamen, setEmpleadoExamen] = useState<EmpleadoPromocion | null>(null)
  const [empleadoDesempeño, setEmpleadoDesempeño] = useState<EmpleadoPromocion | null>(null)
  const imp = usePromocionesImport(onDatosActualizados)

  const empleadosFiltrados = useMemo(() => {
    const base = empleados
      .filter((emp) => {
        const aptitud = calcularAptitud(emp)
        const matchBusqueda =
          busqueda === "" ||
          emp.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          emp.puesto.toLowerCase().includes(busqueda.toLowerCase()) ||
          (emp.numero ?? "").includes(busqueda)
        const matchStatus = filtroStatus === "todos" || aptitud === filtroStatus
        return matchBusqueda && matchStatus
      })
      .sort((a, b) => parseInt(a.numero ?? "0", 10) - parseInt(b.numero ?? "0", 10))

    const habilitados   = base.filter((e) => isHabilitado(e.puesto) || e.regla != null)
    const inhabilitados = base.filter((e) => !isHabilitado(e.puesto) && e.regla == null)
    return { conCategoria: habilitados, sinCategoria: inhabilitados }
  }, [empleados, busqueda, filtroStatus])

  React.useEffect(() => { setPagina(1) }, [busqueda, filtroStatus])

  const todosOrdenados = [...empleadosFiltrados.conCategoria, ...empleadosFiltrados.sinCategoria]
  const totalPaginas = Math.ceil(todosOrdenados.length / PAGE_SIZE)
  const paginados = todosOrdenados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE)
  const paginadosConCategoria = paginados.filter((e) => isHabilitado(e.puesto) || e.regla != null)
  const paginadosSinCategoria = paginados.filter((e) => !isHabilitado(e.puesto) && e.regla == null)

  const hasFilters = busqueda || filtroStatus !== "todos"

  const [exporting, setExporting] = useState(false)
  const exportMeta = useMemo(
    () => ({ filtros: { busqueda, estado: filtroStatus } }),
    [busqueda, filtroStatus]
  )

  const handleExportPDF = useCallback(async () => {
    if (todosOrdenados.length === 0) { notify.error("No hay registros para exportar"); return }
    setExporting(true)
    try {
      await exportPromocionesPDF(todosOrdenados, exportMeta)
      notify.success(`PDF generado (${todosOrdenados.length} registros)`)
    } catch (e) {
      console.error(e)
      notify.error("Error al generar el PDF")
    } finally {
      setExporting(false)
    }
  }, [todosOrdenados, exportMeta])

  const handleExportExcel = useCallback(async () => {
    if (todosOrdenados.length === 0) { notify.error("No hay registros para exportar"); return }
    setExporting(true)
    try {
      await exportPromocionesExcel(todosOrdenados, exportMeta)
      notify.success(`Excel generado (${todosOrdenados.length} registros)`)
    } catch (e) {
      console.error(e)
      notify.error("Error al generar el Excel")
    } finally {
      setExporting(false)
    }
  }, [todosOrdenados, exportMeta])

  return (
    <TooltipProvider delayDuration={300}>
    <div className="space-y-4">

      {/* Hidden file inputs */}
      <input ref={imp.fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={imp.handleFileChange} />
      <input ref={imp.datosFileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={imp.handleDatosFileChange} />

      {/* Import previews */}
      {imp.reglasPreview && (
        <PromReglasPreview
          reglasPreview={imp.reglasPreview}
          cargando={imp.cargando}
          isReadOnly={isReadOnly}
          onClose={() => imp.setReglasPreview(null)}
          onConfirmar={imp.handleCargarReglas}
        />
      )}
      {imp.datosPreview && (
        <PromDatosPreview
          datosPreview={imp.datosPreview}
          datosCargando={imp.datosCargando}
          isReadOnly={isReadOnly}
          onClose={() => imp.setDatosPreview(null)}
          onConfirmar={imp.handleCargarDatos}
        />
      )}

      {/* La búsqueda va en el header (lupa). Barra: estado a la izquierda; descargar, reglas y
          página a la derecha. Descargar y Reglas muestran su texto desde 36rem de ancho. */}
      <HeaderSearch value={busqueda} onValueChange={setBusqueda} label="Buscar empleado, puesto o número"
        placeholder="Buscar empleado, puesto, número…" />
      <div className="@container">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-36 shrink-0" aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Estados</SelectItem>
            {ESTADOS_FILTRO.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex shrink-0 items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exporting || todosOrdenados.length === 0}
                  data-testid="promociones-export-trigger"
                  aria-label={exporting ? "Generando…" : "Descargar"}
                >
                  <Download aria-hidden="true" />
                  <span className="hidden @xl:inline">{exporting ? "Generando…" : "Descargar"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-body-sm font-normal text-muted-foreground">
                  {todosOrdenados.length} registro{todosOrdenados.length !== 1 ? "s" : ""}
                  {hasFilters ? " (filtrados)" : ""}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportPDF} data-testid="promociones-export-pdf" className="gap-2 cursor-pointer">
                  <FileText aria-hidden="true" className={`${PROMOTION_ICON.control} text-destructive`} />
                  <span>Reporte PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel} data-testid="promociones-export-excel" className="gap-2 cursor-pointer">
                  <FileSpreadsheet aria-hidden="true" className={`${PROMOTION_ICON.control} text-success`} />
                  <span>Reporte Excel</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="outline" size="sm">
                  <Link href="/promociones/reglas" aria-label="Reglas">
                    <SlidersHorizontal aria-hidden="true" />
                    <span className="hidden @xl:inline">Reglas</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Reglas</TooltipContent>
            </Tooltip>
            {empleados.length > 0 && todosOrdenados.length > 0 && (
              <CompactPager label="Paginación de empleados" page={pagina} totalPages={totalPaginas} onPageChange={setPagina} />
            )}
        </div>
      </div>
      </div>

      {/* Contenido principal */}
      {empleados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed bg-background">
          <div className="bg-primary/10 p-4 rounded-md mb-4">
            <ChartNoAxesColumnIncreasing aria-hidden="true" className={`${PROMOTION_ICON.emptyState} text-primary`} />
          </div>
          <h3 className="text-heading-md font-bold text-foreground mb-1">Sin datos de empleados</h3>
          <p className="text-body-md text-muted-foreground max-w-sm">
            Carga los datos de empleados con sus evaluaciones de desempeño y el sistema calculará automáticamente la aptitud para promoción.
          </p>
        </div>
      ) : todosOrdenados.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-body-md">Sin resultados para los filtros aplicados</div>
      ) : (
        <>
          <PromotionTable
            conCategoria={paginadosConCategoria}
            sinCategoria={paginadosSinCategoria}
            onPromover={setEmpleadoPromover}
            onCapturarExamen={setEmpleadoExamen}
            onDesempeño={setEmpleadoDesempeño}
          />

        </>
      )}



      {/* Dialogs */}

      {empleadoPromover && (
        <PromPromoverDialog
          empleado={empleadoPromover}
          open={!!empleadoPromover}
          isReadOnly={isReadOnly}
          onClose={() => setEmpleadoPromover(null)}
          onConfirmarPromocion={async (datos) => {
            if (!empleadoPromover.regla?.promocionA) return
            await promoverEmpleado(
              empleadoPromover.id,
              empleadoPromover.numero,
              empleadoPromover.regla.promocionA,
              datos,
            )
          }}
        />
      )}

      {empleadoExamen && (
        <PromExamDialog
          empleado={empleadoExamen}
          open={!!empleadoExamen}
          isReadOnly={isReadOnly}
          onClose={() => setEmpleadoExamen(null)}
          onGuardar={async datos => {
            if (!empleadoExamen.numero) throw new Error("El empleado no tiene N.N asignado")
            await guardarExamen(empleadoExamen.numero, datos)
          }}
        />
      )}

      {empleadoDesempeño && (
        <PromDesempenoDialog
          empleado={empleadoDesempeño}
          open={!!empleadoDesempeño}
          isReadOnly={isReadOnly}
          onClose={() => setEmpleadoDesempeño(null)}
          onGuardar={async (cal, periodo) => {
            if (!empleadoDesempeño.numero) throw new Error("El empleado no tiene N.N asignado")
            await guardarDesempeño(empleadoDesempeño.numero, cal, periodo || undefined)
          }}
        />
      )}
    </div>
    </TooltipProvider>
  )
}
