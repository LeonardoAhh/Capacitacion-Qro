"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { HeaderSearch } from "@/components/ui/header-search"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CompactPager } from "@/components/ui/compact-pager"
import { FILTER_ALL } from "@/components/ui/filter-menu"
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
  const [posSearch, setPosSearch]     = useState("")
  const [selectedDept, setSelectedDept] = useState(FILTER_ALL)
  const [posPage, setPosPage]         = useState(1)

  const getDeptName = (p: Position): string | undefined =>
    (p.department as { name?: string } | null | undefined)?.name
  const filtered = positions.filter(p => {
    const matchesDept   = selectedDept === FILTER_ALL || p.department_id === selectedDept
    const matchesSearch =
      p.name.toLowerCase().includes(posSearch.toLowerCase()) ||
      (getDeptName(p) ?? "").toLowerCase().includes(posSearch.toLowerCase())
    return matchesDept && matchesSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(posPage, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => { setPosPage(1) }, [posSearch, selectedDept])

  const hasFilters = posSearch.trim() !== "" || selectedDept !== FILTER_ALL
  const clearFilters = () => {
    setPosSearch("")
    setSelectedDept(FILTER_ALL)
  }

  return (
    <div className="space-y-4">
      <HeaderSearch
        label="Buscar puesto"
        placeholder="Buscar puesto…"
        value={posSearch}
        onValueChange={setPosSearch}
      />
      {/* Filtro de departamento a la izquierda; "Nuevo puesto" y paginación a la derecha. */}
      <div className="@container flex flex-wrap items-center gap-2">
        <Select value={selectedDept} onValueChange={setSelectedDept}>
          <SelectTrigger className="min-w-0 flex-1 sm:w-52 sm:flex-none" aria-label="Filtrar por departamento">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Departamentos</SelectItem>
            {departments.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="touch-target" onClick={clearFilters} aria-label="Limpiar filtros">
            <X aria-hidden="true" />
            Limpiar
          </Button>
        )}
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
                        className="block truncate rounded-sm text-label-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring">
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
