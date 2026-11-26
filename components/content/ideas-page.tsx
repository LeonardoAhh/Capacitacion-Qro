"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CompactPager } from "@/components/ui/compact-pager"
import { HeaderSearch } from "@/components/ui/header-search"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { aISO, formatFechaCorta } from "@/lib/fechas"
import { cambiarEstadoIdea, cargarIdeas, ESTADOS_IDEA, type EstadoIdea, type Idea } from "@/lib/ideas"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10
const HEAD = "whitespace-nowrap text-eyebrow uppercase"
const TODAS = "todas"
// Día local en que se envió (no el de UTC).
const fecha = (idea: Idea) => formatFechaCorta(aISO(new Date(idea.creada)))
const normalizar = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es-MX")

function EstadoSelect({ idea, onChange }: { idea: Idea; onChange: (estado: EstadoIdea) => void }) {
  return (
    <Select value={idea.estado} onValueChange={value => onChange(value as EstadoIdea)}>
      <SelectTrigger aria-label={`Estado de la idea de ${idea.autor}`} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ESTADOS_IDEA.map(estado => (
          <SelectItem key={estado.value} value={estado.value}>
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-xs", estado.dot)} />
              {estado.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Ideas de mejora del equipo (solo quien tiene canReviewIdeas): una tabla compacta con
 * filtro por estado, búsqueda en el header y paginación; el estado se cambia en la misma fila.
 */
export function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [estado, setEstado] = useState<EstadoIdea | typeof TODAS>(TODAS)
  const [busqueda, setBusqueda] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    let active = true
    cargarIdeas()
      .then(rows => { if (active) setIdeas(rows) })
      .catch(() => { if (active) setLoadError("No se pudieron cargar las ideas.") })
    return () => { active = false }
  }, [])

  useEffect(() => {
    setPage(1)
  }, [estado, busqueda])

  // El cambio se ve al instante y se revierte si la base de datos lo rechaza.
  async function cambiarEstado(idea: Idea, estado: EstadoIdea) {
    setIdeas(current => current?.map(item => item.id === idea.id ? { ...item, estado } : item) ?? current)
    try {
      await cambiarEstadoIdea(idea.id, estado)
    } catch {
      setIdeas(current => current?.map(item => item.id === idea.id ? { ...item, estado: idea.estado } : item) ?? current)
      notify.error("No se pudo cambiar el estado de la idea.")
    }
  }

  if (loadError) return <p role="alert" className="text-body-md text-destructive">{loadError}</p>
  if (!ideas) {
    return (
      <div role="status" aria-label="Cargando ideas" className="grid gap-4">
        <Skeleton className="h-(--control-height) w-40 rounded-md" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  const termino = normalizar(busqueda.trim())
  const visibles = ideas.filter(idea => (estado === TODAS || idea.estado === estado)
    && (!termino || normalizar(`${idea.texto} ${idea.seccion} ${idea.autor}`).includes(termino)))
  const totalPages = Math.max(1, Math.ceil(visibles.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginadas = visibles.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const hasFilters = estado !== TODAS || busqueda.trim() !== ""
  const clearFilters = () => {
    setEstado(TODAS)
    setBusqueda("")
  }

  return (
    <div className="grid gap-4 dense:gap-3">
      <HeaderSearch label="Buscar ideas" placeholder="Idea, sección o persona…" value={busqueda} onValueChange={setBusqueda} />

      {/* Filtro a la izquierda; conteo y paginación a la derecha. */}
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="ideas-estado" className="sr-only">Estado</Label>
        <Select value={estado} onValueChange={value => setEstado(value as EstadoIdea | typeof TODAS)}>
          <SelectTrigger id="ideas-estado" className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Estados</SelectItem>
            {ESTADOS_IDEA.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="touch-target" onClick={clearFilters} aria-label="Limpiar filtros">
            <X aria-hidden="true" />
            Limpiar
          </Button>
        )}
        <div className="ml-auto flex items-center gap-3">
          <p className="text-body-sm tabular-nums text-muted-foreground" aria-live="polite">
            {visibles.length} de {ideas.length} {ideas.length === 1 ? "idea" : "ideas"}
          </p>
          <CompactPager label="Paginación de ideas" page={safePage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {visibles.length === 0 ? (
          <p className="px-(--card-padding) py-10 text-center text-body-md text-muted-foreground">
            {ideas.length ? "Ninguna idea coincide con el filtro." : "Aún no hay ideas. Se envían desde «Ideas de mejora» en la barra lateral."}
          </p>
        ) : (
          <Table className="table-fixed">
            <caption className="sr-only">Ideas de mejora del sistema</caption>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className={HEAD}>Idea</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-44 md:table-cell")}>Sección</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-48 lg:table-cell")}>Propuso</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-28 md:table-cell")}>Fecha</TableHead>
                <TableHead scope="col" className={cn(HEAD, "w-40")}>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginadas.map(idea => (
                <TableRow key={idea.id}>
                  <TableCell className="align-top">
                    <p className="whitespace-pre-wrap break-words text-body-md text-foreground">{idea.texto}</p>
                    {/* En pantallas chicas, lo que no cabe en columnas va debajo de la idea. */}
                    <p className="mt-1 text-body-sm text-muted-foreground lg:hidden">
                      <span className="md:hidden">{idea.seccion} · </span>{idea.autor}
                      <span className="tabular-nums md:hidden"> · {fecha(idea)}</span>
                    </p>
                  </TableCell>
                  <TableCell className="hidden align-top text-body-sm text-foreground md:table-cell">{idea.seccion}</TableCell>
                  <TableCell className="hidden truncate align-top text-body-sm text-foreground lg:table-cell">{idea.autor}</TableCell>
                  <TableCell className="hidden align-top text-body-sm tabular-nums text-muted-foreground md:table-cell">{fecha(idea)}</TableCell>
                  <TableCell className="align-top"><EstadoSelect idea={idea} onChange={estado => void cambiarEstado(idea, estado)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
