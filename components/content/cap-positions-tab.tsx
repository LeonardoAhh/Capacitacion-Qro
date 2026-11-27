"use client"
import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Building2, Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { HeaderSearch } from "@/components/ui/header-search"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CompactPager } from "@/components/ui/compact-pager"
import {
  DEFAULT_FILTER_OPERATORS,
  FilterBar,
  matchesFilterTokens,
  type Filter,
  type FilterFieldDef,
} from "@/components/ui/filter-token-bar"
import type { Department, Position } from "@/lib/hooks"
import { puestoCursosHref } from "@/components/content/plantilla-paths"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 12
const HEAD = "whitespace-nowrap text-eyebrow uppercase"

interface CapPositionsTabProps {
  departments: Department[]
  positions: Position[]
  loadingPositions: boolean
  isReadOnly: boolean
  onNewPosition: () => void
}

export function CapPositionsTab({
  departments, positions, loadingPositions, isReadOnly, onNewPosition,
}: CapPositionsTabProps) {
  const router = useRouter()
  const [posSearch, setPosSearch] = useState("")
  const [filters, setFilters] = useState<Filter[]>([])
  const [posPage, setPosPage] = useState(1)

  const filterFields = useMemo<FilterFieldDef[]>(() => [
    {
      id: "departamento",
      label: "Departamento",
      icon: <Building2 aria-hidden="true" />,
      operators: DEFAULT_FILTER_OPERATORS,
      options: departments.map((d) => ({ value: d.id, label: d.name })),
    },
  ], [departments])

  const getDeptName = (p: Position): string | undefined =>
    (p.department as { name?: string } | null | undefined)?.name

  const filtered = positions.filter((p) => {
    const matchesTokens = matchesFilterTokens(filters, (fieldId) =>
      fieldId === "departamento" ? p.department_id : null,
    )
    if (!matchesTokens) return false
    const query = posSearch.toLowerCase()
    if (!query) return true
    return p.name.toLowerCase().includes(query) || (getDeptName(p) ?? "").toLowerCase().includes(query)
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(posPage, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => { setPosPage(1) }, [posSearch, filters])

  return (
    <div className="space-y-4">
      <HeaderSearch
        label="Buscar puesto"
        placeholder="Buscar puesto…"
        value={posSearch}
        onValueChange={setPosSearch}
      />
      <div className="@container flex flex-wrap items-center gap-2">
        <FilterBar
          fields={filterFields}
          value={filters}
          onChange={setFilters}
          aria-label="Filtros de puestos"
        />
        <div className="ml-auto flex items-center gap-2">
          {!isReadOnly && (
            <Button size="sm" className="touch-target" onClick={onNewPosition} aria-label="Nuevo puesto">
              <Plus aria-hidden="true" />
              <span className="hidden @3xl:inline">Nuevo puesto</span>
            </Button>
          )}
          <CompactPager label="Paginación de puestos" page={safePage} totalPages={totalPages} onPageChange={setPosPage} />
        </div>
      </div>

      {loadingPositions ? (
        <div className="space-y-2" role="status" aria-label="Cargando puestos">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-(--control-height) w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed px-(--card-padding) py-12 text-center text-body-md text-muted-foreground">
          {positions.length === 0
            ? "Aún no hay puestos registrados."
            : "No se encontraron puestos con ese filtro."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table className="table-fixed">
            <caption className="sr-only">Puestos; abre uno para ver sus cursos</caption>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className={HEAD}>Puesto</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-56 sm:table-cell")}>Departamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(pos => {
                const href = puestoCursosHref(pos.id)
                const dept = getDeptName(pos)
                return (
                  <TableRow key={pos.id} className="cursor-pointer" onClick={() => router.push(href)}>
                    <TableCell>
                      <Link href={href} onClick={event => event.stopPropagation()} aria-label={`Ver cursos de ${pos.name}`}
                        className="block truncate rounded-sm text-label-sm text-foreground">
                        {pos.name}
                      </Link>
                      {dept && <span className="block truncate text-body-sm text-muted-foreground sm:hidden">{dept}</span>}
                    </TableCell>
                    <TableCell className="hidden truncate text-body-sm text-muted-foreground sm:table-cell">{dept ?? "-"}</TableCell>
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
