"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, BarChart3 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableHeader } from "@/components/ui/table"
import { EmpleadoHeader, EmpleadoRow, SkeletonRow } from "@/components/content/recontratacion-employee-row"
import { CompactPager } from "@/components/ui/compact-pager"
import { RecontratacionFilters } from "@/components/content/recontratacion-filters"
import { PAGE_SIZE, sortByTermino } from "@/components/content/recontratacion-logic"
import { useNuevoIngreso, type NuevoIngreso } from "@/lib/hooks"

export default function RecontratacionContent() {
  const { loading, error, fetchAll } = useNuevoIngreso()

  const [records, setRecords] = useState<NuevoIngreso[]>([])
  const [search, setSearch] = useState("")
  const [filterDept, setFilterDept] = useState("all")
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setRecords(await fetchAll())
  }, [fetchAll])
  useEffect(() => {
    void load()
  }, [load])

  const departments = useMemo(
    () =>
      Array.from(
        new Set(records.map((record) => record.departamento).filter((department): department is string => !!department)),
      ).sort(),
    [records],
  )

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim()
    return records
      .filter((record) => {
        if (record.tipo_contrato === "Indeterminado") return false
        const matchesSearch =
          !query ||
          record.nombre.toLowerCase().includes(query) ||
          (record.numero ?? "").toLowerCase().includes(query) ||
          (record.puesto ?? "").toLowerCase().includes(query) ||
          (record.departamento ?? "").toLowerCase().includes(query)
        const matchesDepartment = filterDept === "all" || record.departamento === filterDept
        return matchesSearch && matchesDepartment
      })
      .sort(sortByTermino)
  }, [records, search, filterDept])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  )

  useEffect(() => {
    setPage(1)
  }, [search, filterDept])
  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  const imprimir = useCallback((numero: string) => {
    window.open(`/recontratacion/imprimir?numero=${encodeURIComponent(numero)}`, "_blank")
  }, [])

  const hasFilters = search.trim() !== "" || filterDept !== "all"
  const clearFilters = () => {
    setSearch("")
    setFilterDept("all")
  }

  return (
    <div className="grid gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <RecontratacionFilters
          search={search}
          onSearchChange={setSearch}
          departments={departments}
          filterDepartment={filterDept}
          onDepartmentChange={setFilterDept}
          hasFilters={hasFilters}
          onClear={clearFilters}
        />
        {/* Conteo y paginación mínimos, en la misma línea que la búsqueda y el filtro. */}
        {!loading && (
          <div className="ml-auto flex items-center gap-3">
            <p className="text-body-sm tabular-nums text-muted-foreground" aria-live="polite">
              {filtered.length === records.length
                ? `${records.length} empleados`
                : `${filtered.length} de ${records.length}`}
            </p>
            <CompactPager label="Paginación de empleados" page={page} totalPages={pageCount} onPageChange={setPage} />
          </div>
        )}
      </div>

      {!loading && filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card py-12 text-muted-foreground md:py-16" role="status">
          <BarChart3 className="size-8 opacity-25" aria-hidden="true" />
          <p className="text-center text-body-md">
            {hasFilters ? "Sin resultados para los filtros aplicados." : "No hay empleados de nuevo ingreso."}
          </p>
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Quitar filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
          <Table className="table-fixed" aria-label={loading ? "Cargando empleados" : "Contratos por vencer"} aria-busy={loading}>
            <TableHeader className="bg-muted/50">
              <EmpleadoHeader />
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: PAGE_SIZE }, (_, index) => <SkeletonRow key={index} />)
                : paged.map((record) => <EmpleadoRow key={record.id} record={record} onImprimir={imprimir} />)}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
