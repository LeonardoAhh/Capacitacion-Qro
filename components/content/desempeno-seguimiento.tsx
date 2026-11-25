"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, RefreshCw, UserX, X } from "lucide-react"
import { HeaderSearch } from "@/components/ui/header-search"
import { TOOLBAR_FILTER } from "@/components/ui/tabs-toolbar"
import { Button } from "@/components/ui/button"
import { CompactPager } from "@/components/ui/compact-pager"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase/client"
import { PERIODOS_DESEMPENO, TIPO_LABEL } from "@/lib/catalogo"
import { useRole } from "@/lib/hooks"
import { cn } from "@/lib/utils"

// All period strings flattened into one array for filter dropdown
const ALL_PERIODOS: string[] = [
  ...PERIODOS_DESEMPENO.semestrales,
  ...PERIODOS_DESEMPENO.mensuales,
]

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Umbral de calificación reprobada */
import { UMBRAL_CALIFICACION_APROBATORIA } from "@/lib/types/desempeno"


interface EvalRow {
  id: string
  numero_empleado: string
  nombre: string | null
  puesto: string | null
  evaluador_nombre: string | null
  tipo: string
  periodo: string | null
  calificacion_final: number
  compromisos: string
  fecha_revision: string | null
  created_at: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Fecha local (no UTC) en formato YYYY-MM-DD */
function today(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  // Could be YYYY-MM-DD or a free-text date entered by evaluator
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-")
    return `${d}/${m}/${y}`
  }
  return iso
}

type RevisionStatus = "vencido" | "proximo" | "pendiente" | "sin_fecha"

function getRevisionStatus(fechaRevision: string | null): RevisionStatus {
  if (!fechaRevision) return "sin_fecha"
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(fechaRevision) ? fechaRevision : null
  if (!iso) return "pendiente"
  if (iso < today()) return "vencido"
  const diff = (new Date(`${iso}T00:00:00`).getTime() - Date.now()) / 86_400_000
  if (diff <= 14) return "proximo"
  return "pendiente"
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────


// 9 filas de dos líneas caben con la barra superior en una pantalla de escritorio sin scroll.
const PAGE_SIZE = 9
const HEAD = "whitespace-nowrap text-eyebrow uppercase"

/** Estado de la revisión: color solo cuando pide atención (vencida o próxima). */
const REVISION_CFG: Record<RevisionStatus, { label: string; className: string }> = {
  vencido:   { label: "Vencida",    className: "text-destructive" },
  proximo:   { label: "Próxima",    className: "text-warning-deep" },
  pendiente: { label: "Programada", className: "text-foreground" },
  sin_fecha: { label: "Sin fecha",  className: "text-muted-foreground" },
}

/**
 * Compromisos por evaluación: una tabla para todas las pantallas. Columnas con
 * ancho fijo y texto en una o dos líneas; en pantallas chicas se ocultan las
 * secundarias y el periodo pasa debajo del nombre.
 */
function EvalTable({ rows }: { rows: EvalRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table className="table-fixed">
        <caption className="sr-only">Evaluaciones de desempeño con compromisos de mejora registrados</caption>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className={HEAD}>Empleado</TableHead>
            <TableHead scope="col" className={cn(HEAD, "hidden w-36 md:table-cell")}>Periodo</TableHead>
            <TableHead scope="col" className={cn(HEAD, "w-20 text-right")}>Calif.</TableHead>
            <TableHead scope="col" className={cn(HEAD, "hidden w-[30%] lg:table-cell")}>Compromisos</TableHead>
            <TableHead scope="col" className={cn(HEAD, "hidden w-32 sm:table-cell")}>Revisión</TableHead>
            <TableHead scope="col" className={cn(HEAD, "hidden w-44 xl:table-cell")}>Evaluador</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => {
            const tipo = TIPO_LABEL[row.tipo] ?? row.tipo
            const revision = REVISION_CFG[getRevisionStatus(row.fecha_revision)]
            const reprobada = row.calificacion_final < UMBRAL_CALIFICACION_APROBATORIA
            return (
              <TableRow key={row.id}>
                <TableCell>
                  <span className="block truncate text-label-sm text-foreground">{row.nombre ?? `#${row.numero_empleado}`}</span>
                  <span className="block truncate text-body-sm text-muted-foreground md:hidden">
                    {[row.periodo, tipo].filter(Boolean).join(" · ")}
                  </span>
                  <span className="hidden truncate text-body-sm text-muted-foreground md:block">
                    {[`#${row.numero_empleado}`, row.puesto].filter(Boolean).join(" · ")}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="block truncate text-body-sm text-foreground">{row.periodo ?? "—"}</span>
                  <span className="block truncate text-body-sm text-muted-foreground">{tipo}</span>
                </TableCell>
                <TableCell className={cn("text-right text-label-sm tabular-nums", reprobada ? "text-destructive" : "text-foreground")}>
                  {row.calificacion_final}%
                  {reprobada && <span className="sr-only"> (reprobada)</span>}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <p className="line-clamp-2 whitespace-pre-line break-words text-body-sm text-foreground">{row.compromisos}</p>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className={cn("block truncate text-body-sm", revision.className)}>{revision.label}</span>
                  <span className="block truncate text-body-sm text-muted-foreground">{formatDate(row.fecha_revision)}</span>
                </TableCell>
                <TableCell className="hidden truncate text-body-sm text-muted-foreground xl:table-cell">
                  {row.evaluador_nombre ?? "—"}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Status filter options (sin emojis — accesibles para screen readers)
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: string; label: string; dot?: string }[] = [
  { value: "all",       label: "Estados" },
  { value: "reprobado", label: "Reprobados", dot: "bg-destructive" },
  { value: "vencido",   label: "Vencidos",                          dot: "bg-destructive" },
  { value: "proximo",   label: "Próximos", dot: "bg-warning" },
  { value: "pendiente", label: "Pendientes",                        dot: "bg-muted-foreground" },
  { value: "sin_fecha", label: "Sin fecha",                         dot: "bg-border" },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function DesempenoSeguimiento() {
  useRole() // ensures auth guard if needed

  const [rows, setRows] = useState<EvalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [filterPeriodo, setFilterPeriodo] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [page, setPage] = useState(1)

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: dbErr } = await supabase
        .from("evaluaciones_desempeno")
        .select(`
          id,
          numero_empleado,
          evaluador_nombre,
          tipo,
          periodo,
          calificacion_final,
          compromisos,
          fecha_revision,
          created_at
        `)
        .not("compromisos", "is", null)
        .neq("compromisos", "")
        .order("calificacion_final", { ascending: true })

      if (dbErr) throw new Error(dbErr.message)

      // Enrich with nombre/puesto from employees or nuevo_ingreso tables
      const rawRows = (data ?? []) as Omit<EvalRow, "nombre" | "puesto">[]
      const numeros = [...new Set(rawRows.map(r => r.numero_empleado))]

      const nameMap: Record<string, { nombre: string; puesto: string }> = {}
      if (numeros.length > 0) {
        const { data: emps } = await supabase
          .from("employees")
          .select("numero, nombre, puesto")
          .in("numero", numeros)

        for (const e of emps ?? []) {
          if (e.numero) nameMap[e.numero] = { nombre: e.nombre ?? "", puesto: e.puesto ?? "" }
        }

        // Fill gaps from nuevo_ingreso
        const missing = numeros.filter(n => !nameMap[n])
        if (missing.length > 0) {
          const { data: nis } = await supabase
            .from("nuevo_ingreso")
            .select("numero, nombre, puesto")
            .in("numero", missing)
          for (const e of nis ?? []) {
            if (e.numero) nameMap[e.numero] = { nombre: e.nombre ?? "", puesto: e.puesto ?? "" }
          }
        }
      }

      const enriched: EvalRow[] = rawRows.map(r => ({
        ...r,
        nombre: nameMap[r.numero_empleado]?.nombre || null,
        puesto: nameMap[r.numero_empleado]?.puesto || null,
      }))

      setRows(enriched)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows
      .filter(r => {
        if (!q) return true
        return (
          (r.nombre ?? "").toLowerCase().includes(q) ||
          r.numero_empleado.toLowerCase().includes(q) ||
          (r.puesto ?? "").toLowerCase().includes(q)
        )
      })
      .filter(r => filterPeriodo === "all" || r.periodo === filterPeriodo)
      .filter(r => {
        if (filterStatus === "all") return true
        if (filterStatus === "reprobado") return r.calificacion_final < UMBRAL_CALIFICACION_APROBATORIA
        return getRevisionStatus(r.fecha_revision) === filterStatus
      })
  }, [rows, search, filterPeriodo, filterStatus])

  const hasActiveFilters = search !== "" || filterPeriodo !== "all" || filterStatus !== "all"
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  // Si un filtro reduce las páginas, se queda en la última disponible.
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const clearFilters = () => {
    setSearch("")
    setFilterPeriodo("all")
    setFilterStatus("all")
    setPage(1)
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              data-testid="retry-load-button"
            >
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* La búsqueda va en el header (lupa). Barra: filtros a la izquierda y página a la derecha. */}
      {!loading && rows.length > 0 && (
        <>
        <HeaderSearch
          label="Buscar empleado por nombre, número o puesto"
          placeholder="Buscar por nombre, número o puesto…"
          value={search}
          onValueChange={value => { setSearch(value); setPage(1) }}
          data-testid="seguimiento-search-input"
        />
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filtrar seguimiento de compromisos"
        >

          {/* Periodo filter */}
          <Select value={filterPeriodo} onValueChange={value => { setFilterPeriodo(value); setPage(1) }}>
            <SelectTrigger
              className={cn(TOOLBAR_FILTER, "shrink-0")}
              aria-label="Filtrar por período"
              data-testid="filter-periodo-select"
            >
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Periodos</SelectItem>
              {ALL_PERIODOS.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={filterStatus} onValueChange={value => { setFilterStatus(value); setPage(1) }}>
            <SelectTrigger
              className={cn(TOOLBAR_FILTER, "shrink-0")}
              aria-label="Filtrar por estado de revisión"
              data-testid="filter-status-select"
            >
              <SelectValue placeholder="Estado revisión" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(({ value, label, dot }) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2">
                    {dot && (
                      <span
                        aria-hidden="true"
                        className={`size-2 shrink-0 rounded-full ${dot}`}
                      />
                    )}
                    {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} aria-label="Limpiar filtros" data-testid="clear-filters-toolbar-button">
              <X aria-hidden="true" />
              Limpiar
            </Button>
          )}

          <div className="ml-auto shrink-0">
            <CompactPager label="Paginación de compromisos" page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
        </>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2" role="status" aria-live="polite" aria-label="Cargando evaluaciones">
          <span className="sr-only">Cargando evaluaciones…</span>
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-(--control-height) w-full" />)}
        </div>
      )}

      {/* Empty state — no data */}
      {!loading && rows.length === 0 && !error && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-(--card-padding) py-12 text-center">
          <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
          <p className="text-label-sm text-foreground">Todo en orden</p>
          <p className="text-body-sm text-muted-foreground">
            No hay evaluaciones reprobadas con compromisos pendientes de seguimiento.
          </p>
        </div>
      )}

      {/* Empty state — filters too strict */}
      {!loading && rows.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-(--card-padding) py-12 text-center">
          <UserX className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-body-md text-muted-foreground">
            No se encontraron resultados con los filtros actuales.
          </p>
          <Button variant="outline" size="sm" onClick={clearFilters} data-testid="clear-filters-button">
            Limpiar filtros
          </Button>
        </div>
      )}

      {/* Results */}
      {!loading && filtered.length > 0 && <EvalTable rows={pageRows} />}
    </div>
  )
}
