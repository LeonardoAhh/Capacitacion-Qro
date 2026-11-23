"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { History, Trash2 } from "lucide-react"
import { folioExamen, formatFechaExamen, useHistorialExamenes } from "@/lib/hooks/useHistorialExamenes"
import { SearchInput } from "@/components/ui/search-input"
import { TOOLBAR_SEARCH, TabsToolbar } from "@/components/ui/tabs-toolbar"
import { Button } from "@/components/ui/button"
import { CompactPager } from "@/components/ui/compact-pager"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { examenHojaHref } from "@/components/content/examenes-tabs"
import { cn } from "@/lib/utils"

// 9 filas de dos líneas caben con la barra superior en una pantalla de escritorio sin scroll.
const PAGE_SIZE = 9
const HEAD = "whitespace-nowrap text-eyebrow uppercase"

/** Historial: tabla de exámenes generados; cada fila abre su hoja de respuestas. */
export default function HistorialExamenesContent() {
  const router = useRouter()
  const { examenes, loading, error, buscar, eliminar } = useHistorialExamenes()
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    buscar("")
  }, [buscar])

  const totalPages = Math.max(1, Math.ceil(examenes.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = examenes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Búsqueda y página en la línea de las pestañas */}
      <TabsToolbar>
        <SearchInput
          label="Buscar exámenes"
          placeholder="Buscar por folio o nombre…"
          className={TOOLBAR_SEARCH}
          value={searchTerm}
          onValueChange={setSearchTerm}
          onSearch={value => { setPage(1); buscar(value) }}
          loading={loading}
        />
        <CompactPager label="Paginación de exámenes" page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      </TabsToolbar>

      {loading ? (
        <div className="space-y-2" aria-label="Cargando exámenes">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-(--control-height) w-full" />)}
        </div>
      ) : error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-(--card-padding) text-body-md text-destructive">{error}</p>
      ) : examenes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-(--card-padding) py-12 text-center">
          <History className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-label-sm text-foreground">No se encontraron exámenes</p>
          <p className="text-body-sm text-muted-foreground">Los exámenes generados aparecerán aquí para consultar sus hojas de respuestas.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table className="table-fixed">
            <caption className="sr-only">Exámenes generados</caption>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className={HEAD}>Empleado</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-44 md:table-cell")}>Folio</TableHead>
                <TableHead scope="col" className={cn(HEAD, "w-28")}>Categoría</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-44 lg:table-cell")}>Fecha</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-24 text-right sm:table-cell")}>Preguntas</TableHead>
                <TableHead scope="col" className="w-14 px-1"><span className="sr-only">Eliminar</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map(ex => {
                const folio = folioExamen(ex)
                const href = examenHojaHref(ex.id)
                const nombre = ex.empleado?.nombre ?? "Empleado desconocido"
                return (
                  <TableRow key={ex.id} className="cursor-pointer" onClick={() => router.push(href)}>
                    <TableCell>
                      {/* El enlace da acceso con teclado; toda la fila también abre la hoja. */}
                      <Link href={href} onClick={event => event.stopPropagation()}
                        className="block truncate rounded-sm text-label-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                        {nombre}
                      </Link>
                      <span className="block truncate text-body-sm text-muted-foreground md:hidden">{folio}</span>
                      <span className="hidden truncate text-body-sm text-muted-foreground md:block">
                        #{ex.empleado?.numero ?? "—"} · {ex.departamento}
                      </span>
                    </TableCell>
                    <TableCell className="hidden truncate text-body-sm tabular-nums text-foreground md:table-cell">{folio}</TableCell>
                    <TableCell className="text-body-sm text-foreground">Categoría {ex.categoria_destino}</TableCell>
                    <TableCell className="hidden truncate text-body-sm text-muted-foreground lg:table-cell">{formatFechaExamen(ex.created_at)}</TableCell>
                    <TableCell className="hidden text-right text-body-sm tabular-nums text-foreground sm:table-cell">{ex.preguntas.length}</TableCell>
                    <TableCell className="px-1 text-center" onClick={event => event.stopPropagation()}>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Eliminar examen ${folio}`}>
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar examen?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará el historial de este examen (Folio: {folio}).
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => eliminar(ex.id)}>
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
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
