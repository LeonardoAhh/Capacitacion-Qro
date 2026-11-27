"use client"

import React, { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  ChartNoAxesColumnIncreasing,
  CircleDot,
  Download,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DEFAULT_FILTER_OPERATORS,
  FilterBar,
  matchesFilterTokens,
  type Filter,
  type FilterFieldDef,
} from "@/components/ui/filter-token-bar"
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
import { PromPromoverDialog } from "./prom-promover-dialog"
import { PromExamDialog } from "./prom-exam-dialog"
import { PromReglasPreview, PromDatosPreview } from "./prom-import-tab"
import { usePromocionesImport } from "@/lib/hooks/usePromocionesImport"
import { PromotionTable, PromotionTableSkeleton } from "./prom-table-rows"

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

const PROMOCION_FILTER_FIELDS: FilterFieldDef[] = [
  {
    id: "estado",
    label: "Estado",
    icon: <CircleDot aria-hidden="true" />,
    operators: DEFAULT_FILTER_OPERATORS,
    options: ESTADOS_FILTRO,
  },
]

export default function PromocionesContent({
  empleados,
  loading = false,
  onDatosActualizados,
  promoverEmpleado,
  guardarExamen,
}: {
  empleados: EmpleadoPromocion[]
  loading?: boolean
  onDatosActualizados?: () => void
  promoverEmpleado: (empleadoId: string, numero: string | undefined, nuevoPuesto: string, datos: ConfirmarPromocionInput) => Promise<void>
  guardarExamen: (numero: string, datos: ExamenPromocionInput) => Promise<void>
}) {
  const { isReadOnly } = useRole()
  const [busqueda, setBusqueda] = useState("")
  const [filters, setFilters] = useState<Filter[]>([])
  const [pagina, setPagina] = useState(1)
  const [empleadoPromover, setEmpleadoPromover] = useState<EmpleadoPromocion | null>(null)
  const [empleadoExamen, setEmpleadoExamen] = useState<EmpleadoPromocion | null>(null)
  const imp = usePromocionesImport(onDatosActualizados)

  const empleadosIndexados = useMemo(
    () =>
      [...empleados]
        .sort((a, b) => parseInt(a.numero ?? "0", 10) - parseInt(b.numero ?? "0", 10))
        .map((emp) => ({
          emp,
          aptitud: calcularAptitud(emp),
          conCategoria: isHabilitado(emp.puesto) || emp.regla != null,
          nombreLower: emp.nombre.toLowerCase(),
          puestoLower: emp.puesto.toLowerCase(),
          numeroStr: emp.numero ?? "",
        })),
    [empleados],
  )

  const todosOrdenados = useMemo(() => {
    const query = busqueda.trim().toLowerCase()
    const conCategoria: EmpleadoPromocion[] = []
    const sinCategoria: EmpleadoPromocion[] = []
    for (const item of empleadosIndexados) {
      if (!matchesFilterTokens(filters, (fieldId) => (fieldId === "estado" ? item.aptitud : null))) {
        continue
      }
      if (
        query !== "" &&
        !item.nombreLower.includes(query) &&
        !item.puestoLower.includes(query) &&
        !item.numeroStr.includes(query)
      ) {
        continue
      }
      if (item.conCategoria) conCategoria.push(item.emp)
      else sinCategoria.push(item.emp)
    }
    return [...conCategoria, ...sinCategoria]
  }, [empleadosIndexados, busqueda, filters])

  React.useEffect(() => { setPagina(1) }, [busqueda, filters])

  const totalPaginas = Math.ceil(todosOrdenados.length / PAGE_SIZE)
  const { paginadosConCategoria, paginadosSinCategoria } = useMemo(() => {
    const slice = todosOrdenados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE)
    const con: EmpleadoPromocion[] = []
    const sin: EmpleadoPromocion[] = []
    for (const emp of slice) {
      if (isHabilitado(emp.puesto) || emp.regla != null) con.push(emp)
      else sin.push(emp)
    }
    return { paginadosConCategoria: con, paginadosSinCategoria: sin }
  }, [todosOrdenados, pagina])

  const hasFilters = busqueda !== "" || filters.length > 0

  const [exporting, setExporting] = useState(false)
  const exportMeta = useMemo(() => {
    const estadoValues = filters.filter((f) => f.field === "estado").flatMap((f) => f.values)
    return {
      filtros: {
        busqueda,
        estado: estadoValues.length ? estadoValues.join(",") : "todos",
      },
    }
  }, [busqueda, filters])

  const handleExportPDF = useCallback(async () => {
    if (todosOrdenados.length === 0) { notify.error("No hay registros para descargar"); return }
    setExporting(true)
    try {
      await exportPromocionesPDF(todosOrdenados, exportMeta)
      notify.success(`PDF generado (${todosOrdenados.length} registros)`)
    } catch (e) {
      console.error(e)
      notify.error("No se pudo descargar el PDF")
    } finally {
      setExporting(false)
    }
  }, [todosOrdenados, exportMeta])

  const handleExportExcel = useCallback(async () => {
    if (todosOrdenados.length === 0) { notify.error("No hay registros para descargar"); return }
    setExporting(true)
    try {
      await exportPromocionesExcel(todosOrdenados, exportMeta)
      notify.success(`Excel generado (${todosOrdenados.length} registros)`)
    } catch (e) {
      console.error(e)
      notify.error("No se pudo descargar el Excel")
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
        <FilterBar
          fields={PROMOCION_FILTER_FIELDS}
          value={filters}
          onChange={setFilters}
          disabled={loading}
          aria-label="Filtros de categorías"
        />
        <div className="ml-auto flex shrink-0 items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="touch-target"
                  disabled={loading || todosOrdenados.length === 0}
                  loading={exporting}
                  data-testid="promociones-export-trigger"
                  aria-label="Descargar"
                >
                  <Download aria-hidden="true" />
                  <span className="hidden @xl:inline">Descargar</span>
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
                <Button asChild variant="outline" size="sm" className="touch-target">
                  <Link href="/promociones/reglas" aria-label="Reglas">
                    <SlidersHorizontal aria-hidden="true" />
                    <span className="hidden @xl:inline">Reglas</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Reglas</TooltipContent>
            </Tooltip>
            {!loading && empleados.length > 0 && todosOrdenados.length > 0 && (
              <CompactPager label="Paginación de empleados" page={pagina} totalPages={totalPaginas} onPageChange={setPagina} />
            )}
        </div>
      </div>
      </div>

      {/* Contenido principal */}
      {loading ? (
        <PromotionTableSkeleton rows={PAGE_SIZE} />
      ) : empleados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed bg-card">
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
        <PromotionTable
          conCategoria={paginadosConCategoria}
          sinCategoria={paginadosSinCategoria}
          onPromover={setEmpleadoPromover}
          onCapturarExamen={setEmpleadoExamen}
        />
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
    </div>
    </TooltipProvider>
  )
}
