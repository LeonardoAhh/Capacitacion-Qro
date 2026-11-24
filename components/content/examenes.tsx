"use client"

import { useState, useCallback } from "react"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SearchInput } from "@/components/ui/search-input"
import { TOOLBAR_SEARCH, TabsToolbar } from "@/components/ui/tabs-toolbar"
import { CompactPager } from "@/components/ui/compact-pager"
import { FILTER_ALL, FilterMenu } from "@/components/ui/filter-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRole } from "@/lib/hooks"
import { PreguntaExamenDialog } from "@/components/content/pregunta-examen-dialog"
import type { PreguntaExamen, PreguntaInsert } from "@/lib/hooks/useExamenes"
import { CATALOGO_ORGANIZACIONAL } from "@/lib/catalogo"
import { cn } from "@/lib/utils"

const DEPARTAMENTOS = Object.keys(CATALOGO_ORGANIZACIONAL)
const RESPUESTA_LABELS: Record<string, string> = { a: "A", b: "B", c: "C" }
const PAGE_SIZE = 9
const HEAD = "whitespace-nowrap text-eyebrow uppercase"

interface ExamenesContentProps {
  preguntas: PreguntaExamen[]
  loading: boolean
  error: string | null
  /** Conteo total del banco (independiente del filtro), mostrado en el estado inicial. */
  totalBanco?: number | null
  onBuscar: (term: string, departamento?: string) => void
  onCrear: (pregunta: PreguntaInsert) => Promise<PreguntaExamen>
  onActualizar: (id: string, cambios: Partial<PreguntaInsert>) => Promise<PreguntaExamen>
  onEliminar: (id: string) => Promise<void>
}

/** Pregunta en edición: `id` null crea una nueva. */
type Editor = { id: string | null; initial: PreguntaInsert | null }

export default function ExamenesContent({
  preguntas, loading, error, totalBanco = null, onBuscar, onCrear, onActualizar, onEliminar,
}: ExamenesContentProps) {
  const { isReadOnly } = useRole()
  const [searchTerm, setSearchTerm] = useState("")
  const [departamento, setDepartamento] = useState(FILTER_ALL)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(1)

  // El banco se consulta con texto, con departamento o con ambos.
  const depFiltro = departamento === FILTER_ALL ? undefined : departamento
  const consultando = searchTerm.trim() !== "" || depFiltro !== undefined
  const totalPages = Math.max(1, Math.ceil(preguntas.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginadas = preguntas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const consultar = useCallback((term: string, dep: string | undefined) => {
    setPage(1)
    onBuscar(term, dep)
  }, [onBuscar])

  const changeDepartamento = (value: string) => {
    setDepartamento(value)
    consultar(searchTerm, value === FILTER_ALL ? undefined : value)
  }

  const openEdit = (p: PreguntaExamen) => {
    // Normalizar departamento a mayúsculas para que coincida con el catálogo
    const depUpper = p.departamento.toUpperCase()
    setEditor({
      id: p.id,
      initial: {
        departamento: DEPARTAMENTOS.find(d => d === depUpper) ?? p.departamento,
        pregunta: p.pregunta,
        opcion_a: p.opcion_a,
        opcion_b: p.opcion_b,
        opcion_c: p.opcion_c,
        respuesta_correcta: p.respuesta_correcta,
      },
    })
  }

  const handleSave = async (form: PreguntaInsert) => {
    if (!editor) return
    if (editor.id) await onActualizar(editor.id, form)
    else await onCrear(form)
    setEditor(null)
    if (consultando) onBuscar(searchTerm, depFiltro)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await onEliminar(deleteId)
      setDeleteId(null)
    } catch {
      // error se maneja en el hook
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Búsqueda, filtro, "Nueva pregunta" y página en la línea de las pestañas. */}
      <TabsToolbar>
        <SearchInput
          label="Buscar preguntas"
          placeholder="Buscar por pregunta u opción…"
          className={TOOLBAR_SEARCH}
          value={searchTerm}
          onValueChange={setSearchTerm}
          onSearch={term => consultar(term, depFiltro)}
          loading={loading}
        />
        <FilterMenu
          facets={[{
            id: "departamento", label: "Departamento", value: departamento, onChange: changeDepartamento,
            options: DEPARTAMENTOS.map(d => ({ value: d, label: d })),
          }]}
          onClear={() => changeDepartamento(FILTER_ALL)}
        />
        <Button size="sm" onClick={() => setEditor({ id: null, initial: null })} disabled={isReadOnly} aria-label="Nueva pregunta">
          <Plus aria-hidden="true" />
          <span className="hidden sm:inline">Nueva pregunta</span>
        </Button>
        {consultando && <CompactPager label="Paginación de preguntas" page={currentPage} totalPages={totalPages} onPageChange={setPage} />}
      </TabsToolbar>

      {error && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-(--card-padding) py-3 text-body-md text-destructive">
          {error}
        </p>
      )}

      {!consultando ? (
        <p className="rounded-xl border border-dashed px-(--card-padding) py-12 text-center text-body-md text-muted-foreground">
          {totalBanco === null
            ? "Busca una pregunta o filtra por departamento."
            : totalBanco === 0
              ? "El banco está vacío. Crea la primera pregunta."
              : `${totalBanco.toLocaleString("es-MX")} ${totalBanco === 1 ? "pregunta" : "preguntas"} en el banco. Busca o filtra por departamento.`}
        </p>
      ) : loading ? (
        <div className="space-y-2" role="status" aria-label="Cargando preguntas">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-(--control-height) w-full" />)}
        </div>
      ) : preguntas.length === 0 ? (
        <p className="rounded-xl border border-dashed px-(--card-padding) py-12 text-center text-body-md text-muted-foreground">
          No se encontraron preguntas.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table className="table-fixed">
            <caption className="sr-only">Banco de preguntas</caption>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className={HEAD}>Pregunta</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-44 md:table-cell")}>Departamento</TableHead>
                <TableHead scope="col" className={cn(HEAD, "w-24 text-center")}>Respuesta</TableHead>
                <TableHead className="w-24 px-1"><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginadas.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <span className="block truncate text-label-sm text-foreground">{p.pregunta}</span>
                    <span className="block truncate text-body-sm text-muted-foreground md:hidden">{p.departamento}</span>
                  </TableCell>
                  <TableCell className="hidden truncate text-body-sm text-muted-foreground md:table-cell">{p.departamento}</TableCell>
                  <TableCell className="text-center text-label-sm text-foreground">{RESPUESTA_LABELS[p.respuesta_correcta]}</TableCell>
                  <TableCell className="px-1 py-0">
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => openEdit(p)} disabled={isReadOnly} aria-label="Editar pregunta">
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteId(p.id)} disabled={isReadOnly} aria-label="Eliminar pregunta">
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editor && (
        <PreguntaExamenDialog initial={editor.initial} departamentos={DEPARTAMENTOS} readOnly={isReadOnly}
          onClose={() => setEditor(null)} onSave={handleSave} />
      )}

      {/* Confirmar eliminación */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pregunta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La pregunta será eliminada permanentemente del banco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isReadOnly || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
