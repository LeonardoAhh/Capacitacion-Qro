"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, Calendar, CheckCircle2, CircleDot, RefreshCw, UserX } from "lucide-react"
import { HeaderSearch } from "@/components/ui/header-search"
import { Button } from "@/components/ui/button"
import { CompactPager } from "@/components/ui/compact-pager"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DEFAULT_FILTER_OPERATORS,
  FilterBar,
  matchesFilterTokens,
  type Filter,
  type FilterFieldDef,
} from "@/components/ui/filter-token-bar"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase/client"
import { PERIODOS_DESEMPENO, TIPO_LABEL } from "@/lib/catalogo"
import { useRole } from "@/lib/hooks"
import { UMBRAL_CALIFICACION_APROBATORIA } from "@/lib/types/desempeno"
import { describeSupabaseError } from "@/lib/supabase/errors"
import { cn } from "@/lib/utils"

const ALL_PERIODOS: string[] = [
  ...PERIODOS_DESEMPENO.semestrales,
  ...PERIODOS_DESEMPENO.mensuales,
]

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

/** Fecha local (no UTC) en formato YYYY-MM-DD. */
function today(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatDate(iso: string | null): string {
  if (!iso) return "-"
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

const PAGE_SIZE = 9
const HEAD = "whitespace-nowrap text-eyebrow uppercase"

const REVISION_CFG: Record<RevisionStatus, { label: string; className: string }> = {
  vencido:   { label: "Vencida",    className: "text-destructive" },
  proximo:   { label: "Próxima",    className: "text-warning-deep" },
  pendiente: { label: "Programada", className: "text-foreground" },
  sin_fecha: { label: "Sin fecha",  className: "text-muted-foreground" },
}

const SEGUIMIENTO_FILTER_FIELDS: FilterFieldDef[] = [
  {
    id: "periodo",
    label: "Período",
    icon: <Calendar aria-hidden="true" />,
    operators: DEFAULT_FILTER_OPERATORS,
    options: ALL_PERIODOS.map((p) => ({ value: p, label: p })),
  },
  {
    id: "estado",
    label: "Estado",
    icon: <CircleDot aria-hidden="true" />,
    operators: DEFAULT_FILTER_OPERATORS,
    options: [
      { value: "reprobado", label: "Reprobados", glyph: <span aria-hidden="true" className="size-2 rounded-full bg-destructive" /> },
      { value: "vencido", label: "Vencidos", glyph: <span aria-hidden="true" className="size-2 rounded-full bg-destructive" /> },
      { value: "proximo", label: "Próximos", glyph: <span aria-hidden="true" className="size-2 rounded-full bg-warning" /> },
      { value: "pendiente", label: "Pendientes", glyph: <span aria-hidden="true" className="size-2 rounded-full bg-muted-foreground" /> },
      { value: "sin_fecha", label: "Sin fecha", glyph: <span aria-hidden="true" className="size-2 rounded-full bg-border" /> },
    ],
  },
]

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
          {rows.map((row) => {
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
                  <span className="block truncate text-body-sm text-foreground">{row.periodo ?? "-"}</span>
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
                  {row.evaluador_nombre ?? "-"}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default function DesempenoSeguimiento() {
  useRole()

  const [rows, setRows] = useState<EvalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<Filter[]>([])
  const [page, setPage] = useState(1)

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

      const rawRows = (data ?? []) as Omit<EvalRow, "nombre" | "puesto">[]
      const numeros = [...new Set(rawRows.map((r) => r.numero_empleado))]

      const nameMap: Record<string, { nombre: string; puesto: string }> = {}
      if (numeros.length > 0) {
        const { data: emps } = await supabase
          .from("employees")
          .select("numero, nombre, puesto")
          .in("numero", numeros)

        for (const e of emps ?? []) {
          if (e.numero) nameMap[e.numero] = { nombre: e.nombre ?? "", puesto: e.puesto ?? "" }
        }

        const missing = numeros.filter((n) => !nameMap[n])
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

      const enriched: EvalRow[] = rawRows.map((r) => ({
        ...r,
        nombre: nameMap[r.numero_empleado]?.nombre || null,
        puesto: nameMap[r.numero_empleado]?.puesto || null,
      }))

      setRows(enriched)
    } catch (err) {
      setError(describeSupabaseError(err, "No se pudieron cargar los datos"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (
        q &&
        !(r.nombre ?? "").toLowerCase().includes(q) &&
        !r.numero_empleado.toLowerCase().includes(q) &&
        !(r.puesto ?? "").toLowerCase().includes(q)
      ) {
        return false
      }
      return matchesFilterTokens(filters, (fieldId) => {
        if (fieldId === "periodo") return r.periodo ?? ""
        if (fieldId === "estado") {
          const rev = getRevisionStatus(r.fecha_revision)
          return r.calificacion_final < UMBRAL_CALIFICACION_APROBATORIA ? [rev, "reprobado"] : [rev]
        }
        return null
      })
    })
  }, [rows, search, filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const clearFilters = () => {
    setSearch("")
    setFilters([])
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load()}
              data-testid="retry-load-button"
            >
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!loading && rows.length > 0 && (
        <>
          <HeaderSearch
            label="Buscar empleado por nombre, número o puesto"
            placeholder="Buscar por nombre, número o puesto…"
            value={search}
            onValueChange={(value) => { setSearch(value); setPage(1) }}
            data-testid="seguimiento-search-input"
          />
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filtrar seguimiento de compromisos"
          >
            <FilterBar
              fields={SEGUIMIENTO_FILTER_FIELDS}
              value={filters}
              onChange={(next) => { setFilters(next); setPage(1) }}
              aria-label="Filtros de compromisos"
            />
            <div className="ml-auto shrink-0">
              <CompactPager label="Paginación de compromisos" page={currentPage} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        </>
      )}

      {loading && (
        <div className="space-y-2" role="status" aria-live="polite" aria-label="Cargando evaluaciones">
          <span className="sr-only">Cargando evaluaciones…</span>
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-(--control-height) w-full" />)}
        </div>
      )}

      {!loading && rows.length === 0 && !error && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-(--card-padding) py-12 text-center">
          <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
          <p className="text-label-sm text-foreground">Todo en orden</p>
          <p className="text-body-sm text-muted-foreground">
            No hay evaluaciones reprobadas con compromisos pendientes de seguimiento.
          </p>
        </div>
      )}

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

      {!loading && filtered.length > 0 && <EvalTable rows={pageRows} />}
    </div>
  )
}
