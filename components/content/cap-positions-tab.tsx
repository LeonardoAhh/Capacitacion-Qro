"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, BookOpen } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { TOOLBAR_FILTER, TOOLBAR_SEARCH, TabsToolbar } from "@/components/ui/tabs-toolbar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PaginationBar } from "@/components/ui/pagination-bar"
import type { Department, Position } from "@/lib/hooks"
import { puestoCursosHref } from "@/components/content/plantilla-paths"

const PAGE_SIZE = 8

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
  const [posSearch, setPosSearch]     = useState("")
  const [selectedDept, setSelectedDept] = useState("all")
  const [posPage, setPosPage]         = useState(1)

  const getDeptName = (p: Position): string | undefined =>
    (p.department as { name?: string } | null | undefined)?.name
  const filtered = positions.filter(p => {
    const matchesDept   = selectedDept === "all" || p.department_id === selectedDept
    const matchesSearch =
      p.name.toLowerCase().includes(posSearch.toLowerCase()) ||
      (getDeptName(p) ?? "").toLowerCase().includes(posSearch.toLowerCase())
    return matchesDept && matchesSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(posPage, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => { setPosPage(1) }, [posSearch, selectedDept])

  return (
    <div className="space-y-4">
      {/* Búsqueda, filtro y "Nuevo puesto" en la línea de las pestañas. */}
      <TabsToolbar>
        <SearchInput
          label="Buscar puesto"
          placeholder="Buscar puesto…"
          className={TOOLBAR_SEARCH}
          value={posSearch}
          onValueChange={setPosSearch}
        />
        <Select value={selectedDept} onValueChange={setSelectedDept}>
          <SelectTrigger className={TOOLBAR_FILTER} aria-label="Filtrar por departamento">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Departamentos</SelectItem>
            {departments.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isReadOnly && (
          <Button onClick={onNewPosition} className="min-w-(--control-height) px-3" aria-label="Nuevo puesto">
            <span className="hidden sm:inline">Nuevo puesto</span>
            <Plus className="sm:hidden" aria-hidden="true" />
          </Button>
        )}
      </TabsToolbar>

      {loadingPositions ? (
        <div className="rounded-md border border-border/60 overflow-hidden bg-transparent shadow-none">
          <div className="divide-y divide-border/60">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-4 flex-1 bg-muted" />
                <Skeleton className="h-4 w-32 hidden sm:block bg-muted" />
                <Skeleton className="h-8 w-24 rounded-md bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {positions.length === 0
            ? "No hay puestos cargados. Usa la pestaña Importar para cargar datos."
            : "No se encontraron puestos con ese filtro."}
        </div>
      ) : (
        <>
          <div className="rounded-md border border-border/60 shadow-none overflow-hidden bg-transparent">
            <Table>
              <TableHeader>
                <TableRow className="bg-transparent hover:bg-transparent border-border/60">
                  <TableHead>Puesto</TableHead>
                  <TableHead className="hidden sm:table-cell">Departamento</TableHead>
                  <TableHead className="text-center w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(pos => (
                  <TableRow key={pos.id} className="hover:bg-muted/30 border-border/60">
                    <TableCell className="text-sm font-medium text-ink">{pos.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground font-normal">
                      <span>{getDeptName(pos) ?? "—"}</span>
                    </TableCell>
                    <TableCell className="text-center p-2">
                      <Button asChild variant="ghost" size="sm" className="mx-auto">
                        <Link href={puestoCursosHref(pos.id)} aria-label={`Ver cursos de ${pos.name}`}>
                          <BookOpen aria-hidden="true" />
                          <span>Ver</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filtered.length > PAGE_SIZE && (
            <div className="mt-4 flex justify-end">
              <PaginationBar currentPage={safePage} totalPages={totalPages} onPageChange={setPosPage} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
