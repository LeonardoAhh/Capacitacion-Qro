"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  CheckCircle2, AlertCircle, Loader2,
  UserPlus, FileUp, MessageSquareShare,
} from "lucide-react"
import { EvalCell, ContratoTerminoCell } from "@/components/content/shared/eval-badges"
import { Button } from "@/components/ui/button"
import { CompactPager } from "@/components/ui/compact-pager"
import { SearchInput } from "@/components/ui/search-input"
import { TOOLBAR_SEARCH } from "@/components/ui/tabs-toolbar"
import { FilterMenu } from "@/components/ui/filter-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useNuevoIngreso, formatDate, daysFromToday, useRole } from "@/lib/hooks"
import type { NuevoIngreso, NuevoIngresoUpdate } from "@/lib/hooks"
import { supabase } from "@/lib/supabase/client"
import { notify } from "@/lib/notify"

const HEAD = "whitespace-nowrap text-eyebrow uppercase"

const dialogLoading = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center gap-2 bg-background/80 text-sm text-muted-foreground" role="status" aria-live="polite">
    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
    Cargando herramienta…
  </div>
)

const EditEmployeeDialog = dynamic(
  () => import("@/components/content/edit-employee-dialog").then((module) => module.EditEmployeeDialog),
  { ssr: false, loading: dialogLoading },
)
const CreateEmployeeDialog = dynamic(
  () => import("@/components/content/create-employee-dialog").then((module) => module.CreateEmployeeDialog),
  { ssr: false, loading: dialogLoading },
)
const IncidenciasBulkImport = dynamic(
  () => import("@/components/content/incidencias-bulk-import").then((module) => module.IncidenciasBulkImport),
  { ssr: false, loading: dialogLoading },
)
export default function NuevoIngresoContent() {
  const { isReadOnly } = useRole()
  const { loading, saving, error, fetchAll, updateRecord, deleteRecord, createRecord } = useNuevoIngreso()

  const [records, setRecords] = useState<NuevoIngreso[]>([])
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [filterContrato, setFilterContrato] = useState('all')
  const [filterRG, setFilterRG] = useState('all')
  const [filterTurno, setFilterTurno] = useState('all')
  const [editRecord, setEditRecord] = useState<NuevoIngreso | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Nuevo empleado dialog
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [createSuccess, setCreateSuccess] = useState(false)

  const [bulkImportOpen, setBulkImportOpen] = useState(false)
  const [capEmployeeNamesLoading, setCapEmployeeNamesLoading] = useState(false)
  const [loadedDialogs, setLoadedDialogs] = useState({
    edit: false,
    create: false,
    incidencias: false,
  })

  const markDialogLoaded = useCallback((dialog: keyof typeof loadedDialogs) => {
    setLoadedDialogs((loaded) => loaded[dialog] ? loaded : { ...loaded, [dialog]: true })
  }, [])

  // Map numero → nombre for bulk import preview (from both nuevo_ingreso + employees)
  const [capEmployeeNames, setCapEmployeeNames] = useState<Record<string, string>>({})
  const capFetched = useRef(false)
  const capFetchInFlight = useRef(false)

  const employeeNames = useMemo(() => {
    const map: Record<string, string> = { ...capEmployeeNames }
    records.forEach(r => { if (r.numero) map[r.numero] = r.nombre })
    return map
  }, [records, capEmployeeNames])

  const load = useCallback(async () => {
    setRecords(await fetchAll())
  }, [fetchAll])

  useEffect(() => { load() }, [load])

  // Opciones únicas para filtros
  const departments = Array.from(new Set(records.map(r => r.departamento).filter(Boolean))).sort() as string[]
  const turnos = Array.from(new Set(records.map(r => r.turno).filter(Boolean))).sort() as string[]

  // Filtrado
  const filtered = records.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      r.nombre.toLowerCase().includes(q) ||
      (r.numero ?? '').toLowerCase().includes(q) ||
      (r.puesto ?? '').toLowerCase().includes(q) ||
      (r.departamento ?? '').toLowerCase().includes(q) ||
      (r.area ?? '').toLowerCase().includes(q) ||
      (r.curp ?? '').toLowerCase().includes(q) ||
      (r.jefe_area ?? '').toLowerCase().includes(q) ||
      (r.turno ?? '').toLowerCase().includes(q)
    const matchDept = filterDept === 'all' || r.departamento === filterDept
    const matchContrato = filterContrato === 'all' || r.tipo_contrato === filterContrato
    const matchRG = filterRG === 'all' || r.rg_rec_048 === filterRG
    const matchTurno = filterTurno === 'all' || r.turno === filterTurno
    return matchSearch && matchDept && matchContrato && matchRG && matchTurno
  }).sort((a, b) => {
    const na = a.numero ? parseInt(a.numero, 10) : Infinity
    const nb = b.numero ? parseInt(b.numero, 10) : Infinity
    if (na !== nb && !Number.isNaN(na) && !Number.isNaN(nb)) return nb - na
    return a.nombre.localeCompare(b.nombre)
  })

  // Paginación
  const PAGE_SIZE = 9
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedFiltered = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Reset página al cambiar filtros
  useEffect(() => { setCurrentPage(1) }, [search, filterDept, filterContrato, filterRG, filterTurno])


  const handleEdit = (record: NuevoIngreso) => {
    markDialogLoaded("edit")
    setEditRecord(record)
    setEditOpen(true)
  }

  const handleOpenIncidenciasImport = async () => {
    markDialogLoaded("incidencias")
    if (capFetchInFlight.current) return
    if (!capFetched.current) {
      capFetched.current = true
      capFetchInFlight.current = true
      setCapEmployeeNamesLoading(true)
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("numero, nombre")
          .not("numero", "is", null)
        if (error) throw error

        const map: Record<string, string> = {}
        data?.forEach((employee: { numero: string | null; nombre: string }) => {
          if (employee.numero) map[employee.numero] = employee.nombre
        })
        setCapEmployeeNames(map)
      } catch (error) {
        capFetched.current = false
        console.error("No se pudieron cargar los nombres de empleados para la vista previa.", error)
        notify.error("No se pudieron cargar los nombres de empleados para la vista previa.")
        return
      } finally {
        capFetchInFlight.current = false
        setCapEmployeeNamesLoading(false)
      }
    }
    setBulkImportOpen(true)
  }

  const handleSave = async (id: string, updates: NuevoIngresoUpdate) => {
    const result = await updateRecord(id, updates)
    if (result.success) {
      setEditOpen(false)
      setEditRecord(null)
      load()
    }
  }

  const handleDelete = async (id: string) => {
    const result = await deleteRecord(id)
    if (result.success) {
      setEditOpen(false)
      setEditRecord(null)
      load()
    }
  }

  const handleCreate = async (data: Omit<NuevoIngreso, 'id' | 'created_at' | 'updated_at'>) => {
    const result = await createRecord(data)
    if (result.success) {
      setNuevoOpen(false)
      setCreateSuccess(true)
      load()
      setTimeout(() => setCreateSuccess(false), 4000)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>

      {/* Alertas */}
      {createSuccess && (
        <Alert className="border-success/30 bg-success/10 text-success">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            Empleado creado correctamente.
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Búsqueda, filtros y acciones en una sola fila; en pantallas chicas se acomodan en varias. */}
      <div className="flex flex-wrap items-center gap-2" role="search" aria-label="Filtros de empleados">
        <SearchInput
          label="Buscar empleado"
          placeholder="Buscar empleado…"
          className={TOOLBAR_SEARCH}
          value={search}
          onValueChange={setSearch}
        />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <FilterMenu
            onClear={() => { setFilterDept('all'); setFilterContrato('all'); setFilterTurno('all'); setFilterRG('all') }}
            facets={[
              { id: 'departamento', label: 'Departamento', value: filterDept, onChange: setFilterDept,
                options: departments.map(d => ({ value: d, label: d })) },
              { id: 'contrato', label: 'Contrato', value: filterContrato, onChange: setFilterContrato,
                options: [{ value: 'A prueba', label: 'A prueba' }, { value: 'Indeterminado', label: 'Indeterminado' }] },
              { id: 'turno', label: 'Turno', value: filterTurno, onChange: setFilterTurno,
                options: turnos.map(t => ({ value: t, label: `Turno ${t}` })) },
              { id: 'plan', label: 'Plan de formación', value: filterRG, onChange: setFilterRG,
                options: [{ value: 'Pendiente', label: 'Pendiente' }, { value: 'Entregado', label: 'Entregado' }] },
            ]}
          />
          {!isReadOnly && <>
            <Button asChild variant="outline" size="sm" className="max-sm:w-(--control-height) max-sm:px-0">
              <Link href="/ingresos/compartir-pendientes" aria-label="Compartir pendientes">
                <MessageSquareShare className="sm:hidden" aria-hidden="true" />
                <span className="hidden sm:inline">Pendientes</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="max-sm:w-(--control-height) max-sm:px-0" onClick={handleOpenIncidenciasImport} disabled={capEmployeeNamesLoading} aria-busy={capEmployeeNamesLoading} aria-label="Importar incidencias">
              {capEmployeeNamesLoading
                ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                : <FileUp className="sm:hidden" aria-hidden="true" />}
              <span className="hidden sm:inline">{capEmployeeNamesLoading ? "Cargando…" : "Incidencias"}</span>
            </Button>
            <Button size="sm" className="max-sm:w-(--control-height) max-sm:px-0" onClick={() => {
              markDialogLoaded("create")
              setNuevoOpen(true)
            }} aria-label="Nuevo empleado">
              <UserPlus className="sm:hidden" aria-hidden="true" />
              <span className="hidden sm:inline">Nuevo empleado</span>
            </Button>
          </>}
          <CompactPager label="Paginación de empleados" page={safePage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>

      {/* Tabla: una para todas las pantallas; las columnas secundarias se ocultan al reducir el ancho. */}
      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Cargando empleados">
          {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-(--control-height) w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed px-(--card-padding) py-12 text-center text-body-md text-muted-foreground">
          {records.length === 0
            ? (isReadOnly
                ? 'No hay empleados registrados.'
                : 'No hay empleados registrados. Usa el botón “Nuevo empleado” para crear el primero.')
            : 'Sin empleados que coincidan con el filtro.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table className="table-fixed">
            <caption className="sr-only">Empleados de nuevo ingreso</caption>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className={HEAD}>Empleado</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-32 lg:table-cell")}>Ingreso</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-32 sm:table-cell")}>Eval. 1er mes</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-32 lg:table-cell")}>Eval. 2do mes</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-32 xl:table-cell")}>Eval. 3er mes</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-40 xl:table-cell")}>Contrato</TableHead>
                <TableHead scope="col" className={cn(HEAD, "w-28")}>RG-REC-048</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedFiltered.map(r => {
                const rgDias = daysFromToday(r.fecha_vencimiento_rg)
                const entregado = r.rg_rec_048 === 'Entregado'
                const rgUrgente = !entregado && rgDias !== null && rgDias <= 7
                return (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => handleEdit(r)}>
                    <TableCell>
                      {/* El botón da acceso con teclado; toda la fila también responde al clic. */}
                      <button type="button" aria-label={`Editar empleado ${r.nombre}`}
                        onClick={event => { event.stopPropagation(); handleEdit(r) }}
                        className="block w-full min-w-0 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                        <span className="block truncate text-label-sm text-foreground">{r.nombre}</span>
                        <span className="block truncate text-body-sm text-muted-foreground">
                          {[`#${r.numero ?? '—'}`, r.puesto, r.turno && `Turno ${r.turno}`].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="block truncate text-body-sm text-foreground">{formatDate(r.fecha_ingreso)}</span>
                      <span className="block truncate text-body-sm text-muted-foreground">{r.departamento}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <EvalCell fecha={r.eval_1_fecha} calificacion={r.eval_1_calificacion} numeroEvaluacion={1} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <EvalCell fecha={r.eval_2_fecha} calificacion={r.eval_2_calificacion} numeroEvaluacion={2} />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <EvalCell fecha={r.eval_3_fecha} calificacion={r.eval_3_calificacion} numeroEvaluacion={3} />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <ContratoTerminoCell tipo={r.tipo_contrato} fecha={r.termino_contrato} indeterminado={r.tipo_contrato === 'Indeterminado'} />
                    </TableCell>
                    <TableCell>
                      <span className={cn("block truncate text-body-sm", entregado ? "text-success" : rgUrgente ? "text-destructive" : "text-warning-deep")}>
                        {r.rg_rec_048}
                      </span>
                      <span className="block truncate text-body-sm text-muted-foreground">{formatDate(r.fecha_vencimiento_rg)}</span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog de creación de nuevo empleado */}
      {loadedDialogs.create && <CreateEmployeeDialog
        open={nuevoOpen}
        saving={saving}
        onClose={() => setNuevoOpen(false)}
        onCreate={handleCreate}
      />}

      {loadedDialogs.edit && <EditEmployeeDialog
        record={editRecord}
        open={editOpen}
        saving={saving}
        onClose={() => { setEditOpen(false); setEditRecord(null) }}
        onSave={handleSave}
        onDelete={handleDelete}
      />}

      {loadedDialogs.incidencias && <IncidenciasBulkImport
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        employeeNames={employeeNames}
      />}

    </>
  )
}
