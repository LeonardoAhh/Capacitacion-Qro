"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { CompactPager } from "@/components/ui/compact-pager"
import { SearchInput } from "@/components/ui/search-input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TOOLBAR_SEARCH } from "@/components/ui/tabs-toolbar"
import type { EvaluacionVencida } from "@/lib/desempeno/regularizacion/servicio"
import { HITOS_NUEVO_INGRESO } from "@/lib/desempeno/hitos-nuevo-ingreso"
import { formatDate } from "@/lib/hooks/useNuevoIngreso"
import { cn } from "@/lib/utils"
import { EstadoVacioRegularizacion } from "./estado-vacio"

const PAGE_SIZE = 9
const HEAD = "whitespace-nowrap text-eyebrow uppercase"

const tipoEvaluacion = (item: EvaluacionVencida) =>
  item.hito_nuevo_ingreso ? HITOS_NUEVO_INGRESO[item.hito_nuevo_ingreso - 1].etiqueta : "Semestral"

export function PendientesLista({ items, onSelect }: {
  items: EvaluacionVencida[]
  onSelect: (item: EvaluacionVencida) => void
}) {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const visibles = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es")
    return term ? items.filter((item) =>
      item.numero.toLocaleLowerCase("es").includes(term)
      || item.nombre.toLocaleLowerCase("es").includes(term)
      || item.periodo.toLocaleLowerCase("es").includes(term),
    ) : []
  }, [items, query])
  const buscando = query.trim().length > 0
  const totalPages = Math.max(1, Math.ceil(visibles.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = visibles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput value={query} onValueChange={value => { setQuery(value); setPage(1) }}
        label="Buscar por número, nombre o periodo" placeholder="Buscar por número, nombre o periodo…" className={TOOLBAR_SEARCH} />
      <div className="ml-auto flex items-center gap-2">
        <CompactPager label="Paginación de evaluaciones vencidas" page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>

    {buscando && visibles.length ? <div className="overflow-hidden rounded-xl border bg-card">
      <Table className="table-fixed">
        <caption className="sr-only">Evaluaciones vencidas</caption>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className={HEAD}>Empleado</TableHead>
            <TableHead scope="col" className={cn(HEAD, "hidden w-40 md:table-cell")}>Evaluación</TableHead>
            <TableHead scope="col" className={cn(HEAD, "hidden w-32 sm:table-cell")}>Venció</TableHead>
            <TableHead scope="col" className="w-32 text-right"><span className="sr-only">Acción</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.map((item) => {
            const tipo = tipoEvaluacion(item)
            return <TableRow key={`${item.numero}:${item.periodo}:${item.hito_nuevo_ingreso ?? "planta"}`} className="cursor-pointer" onClick={() => onSelect(item)}>
              <TableCell>
                <span className="block truncate text-label-sm text-foreground">{item.nombre}</span>
                <span className="block truncate text-body-sm tabular-nums text-muted-foreground">#{item.numero} · {item.periodo}<span className="md:hidden"> · {tipo}</span></span>
              </TableCell>
              <TableCell className="hidden truncate text-body-sm text-muted-foreground md:table-cell">{tipo}</TableCell>
              <TableCell className="hidden text-body-sm tabular-nums text-muted-foreground sm:table-cell">
                <time dateTime={item.fecha_limite}>{formatDate(item.fecha_limite)}</time>
              </TableCell>
              <TableCell className="text-right">
                <Button type="button" size="sm" variant="outline" className="touch-target" onClick={event => { event.stopPropagation(); onSelect(item) }}
                  aria-label={`Capturar ${item.hito_nuevo_ingreso ? `${tipo} de ` : ""}${item.periodo} de ${item.nombre}`}>
                  Capturar
                </Button>
              </TableCell>
            </TableRow>
          })}
        </TableBody>
      </Table>
    </div> : <EstadoVacioRegularizacion estado={items.length === 0 ? "sin-pendientes" : buscando ? "sin-coincidencias" : "inicio"} />}
  </div>
}
