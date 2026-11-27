"use client"

import { useState, useEffect, useCallback, useId } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DateTextInput } from "@/components/ui/date-text-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CompactPager } from "@/components/ui/compact-pager"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  useActasSeguimiento,
  ACTA_ESTATUSES,
  type ActaSeguimiento, type ActaEstatus,
} from "@/lib/hooks/useActasSeguimiento"
import { useRole } from "@/lib/hooks"
import { formatDate } from "@/lib/hooks/useNuevoIngreso"
import { notify } from "@/lib/notify"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 9
const HEAD = "whitespace-nowrap text-eyebrow uppercase"

function sentenceCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLocaleLowerCase("es-MX")
}

function today(): string {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

/** La revisión ya pasó. */
function isVencido(fecha: string | null): boolean {
  if (!fecha) return false
  return fecha < today()
}

/** La revisión cae en los próximos 7 días. */
function isProximo(fecha: string | null): boolean {
  if (!fecha) return false
  const diff = (new Date(fecha).getTime() - new Date(today()).getTime()) / 86_400_000
  return diff >= 0 && diff <= 7
}

/** Estado de la revisión; solo importa mientras el acta no está cerrada. */
function revision(acta: ActaSeguimiento) {
  if (acta.estatus === "CERRADO") return { tone: "text-muted-foreground", label: null }
  if (isVencido(acta.fecha_seguimiento)) return { tone: "text-destructive", label: "Vencida" }
  if (isProximo(acta.fecha_seguimiento)) return { tone: "text-warning-deep", label: "Próxima" }
  return { tone: "text-muted-foreground", label: null }
}

function RevisionFecha({ acta }: { acta: ActaSeguimiento }) {
  const { tone, label } = revision(acta)
  if (!acta.fecha_seguimiento) return <span className="text-muted-foreground">-</span>
  return <span className={cn("tabular-nums", tone)}>
    <time dateTime={acta.fecha_seguimiento}>{formatDate(acta.fecha_seguimiento)}</time>
    {label && <span className="sr-only"> ({label})</span>}
  </span>
}

function EstatusBadge({ estatus }: { estatus: ActaEstatus }) {
  return <Badge variant={estatus === "CERRADO" ? "secondary" : "outline"} size="sm" className="whitespace-nowrap">{sentenceCase(estatus)}</Badge>
}

interface FormState {
  fecha: string
  descripcion: string
  fecha_seguimiento: string
  estatus: ActaEstatus
}

function blankForm(): FormState {
  return { fecha: today(), descripcion: "", fecha_seguimiento: "", estatus: "ACTIVO" }
}

function EstatusSelect({ id, value, onChange, label }: { id?: string; value: ActaEstatus; onChange: (value: ActaEstatus) => void; label?: string }) {
  return <Select value={value} onValueChange={v => onChange(v as ActaEstatus)}>
    <SelectTrigger id={id} aria-label={label}><SelectValue /></SelectTrigger>
    <SelectContent>
      {ACTA_ESTATUSES.map(s => <SelectItem key={s} value={s}>{sentenceCase(s)}</SelectItem>)}
    </SelectContent>
  </Select>
}

function ActaDetalle({ acta, canEdit, canDelete, onClose, onChangeEstatus, onDelete }: {
  acta: ActaSeguimiento
  canEdit: boolean
  canDelete: boolean
  onClose: () => void
  onChangeEstatus: (id: string, estatus: ActaEstatus) => void
  onDelete: (id: string) => void
}) {
  const { label } = revision(acta)
  return <ResponsiveShell open onClose={onClose} title="Acta administrativa" description={`Registrada el ${formatDate(acta.fecha)}`} size="sm">
    <ModalHeader title="Acta administrativa" onClose={onClose} />
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-(--card-padding)">
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-label-sm text-muted-foreground">Fecha</dt>
          <dd className="text-body-md tabular-nums text-foreground">{formatDate(acta.fecha)}</dd>
        </div>
        <div>
          <dt className="text-label-sm text-muted-foreground">Revisión</dt>
          <dd className="text-body-md"><RevisionFecha acta={acta} />{label && <span aria-hidden="true" className={cn("ml-1", revision(acta).tone)}>· {label}</span>}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-label-sm text-muted-foreground">Descripción</dt>
          <dd className="whitespace-pre-line break-words text-body-md text-foreground">{acta.descripcion || "Sin descripción"}</dd>
        </div>
        {!canEdit && <div>
          <dt className="text-label-sm text-muted-foreground">Estatus</dt>
          <dd><EstatusBadge estatus={acta.estatus} /></dd>
        </div>}
      </dl>
      {canEdit && <div className="flex items-end gap-2 border-t pt-4">
        <div className="min-w-0 flex-1 space-y-1.5 sm:max-w-56">
          <Label htmlFor={`acta-estatus-${acta.id}`}>Estatus</Label>
          <EstatusSelect id={`acta-estatus-${acta.id}`} value={acta.estatus} onChange={estatus => onChangeEstatus(acta.id, estatus)} />
        </div>
        {canDelete && <Button type="button" variant="ghost" size="icon" className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(acta.id)} aria-label="Eliminar registro">
          <Trash2 aria-hidden="true" />
        </Button>}
      </div>}
    </div>
  </ResponsiveShell>
}

export interface ActasSeguimientoPageProps {
  numeroEmpleado: string
}

export function ActasSeguimientoPage({ numeroEmpleado }: ActasSeguimientoPageProps) {
  const { canCapturePlantilla, canEdit } = useRole()
  const { loading, saving, fetchByEmpleado, create, update, remove } = useActasSeguimiento()

  const [records, setRecords] = useState<ActaSeguimiento[]>([])
  const [nombreEmpleado, setNombreEmpleado] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(blankForm)
  const formId = useId()

  const load = useCallback(async () => {
    const data = await fetchByEmpleado(numeroEmpleado)
    setRecords(data)
  }, [fetchByEmpleado, numeroEmpleado])

  useEffect(() => {
    setRecords([])
    setNombreEmpleado(null)
    setPage(1)
    void load()
    let active = true
    supabase.from("employees").select("nombre").eq("numero", numeroEmpleado).maybeSingle()
      .then(({ data }) => { if (active) setNombreEmpleado(data?.nombre ?? null) })
    return () => { active = false }
  }, [load, numeroEmpleado])

  const closeForm = () => { setShowForm(false) }

  const handleSave = async () => {
    if (!form.fecha) { notify.error("Falta la fecha"); return }
    const result = await create({
      numero_empleado: numeroEmpleado,
      tipo: "ACTA ADMINISTRATIVA",
      fecha: form.fecha,
      descripcion: form.descripcion || null,
      fecha_seguimiento: form.fecha_seguimiento || null,
      estatus: form.estatus,
      created_by: null,
    })
    if (result.success) {
      setShowForm(false)
      setForm(blankForm())
      setPage(1)
      void load()
      notify.success("Acta guardada")
    } else {
      notify.error(result.error ?? "No se pudo guardar")
    }
  }

  const handleChangeEstatus = async (id: string, estatus: ActaEstatus) => {
    const result = await update(id, { estatus })
    if (result.success) {
      setRecords(prev => prev.map(r => r.id === id ? { ...r, estatus } : r))
    } else {
      notify.error(result.error ?? "No se pudo cambiar el estatus")
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await notify.confirm({
      title: "Eliminar registro",
      description: "No se puede deshacer.",
      confirmLabel: "Eliminar",
      size: "xs",
      tone: "destructive",
    })
    if (!ok) return
    const result = await remove(id)
    if (result.success) {
      setSelectedId(null)
      setRecords(prev => prev.filter(r => r.id !== id))
    } else {
      notify.error(result.error ?? "No se pudo eliminar")
    }
  }

  const vencidos = records.filter(r => isVencido(r.fecha_seguimiento) && r.estatus !== "CERRADO").length
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleRecords = records.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const selected = records.find(r => r.id === selectedId) ?? null

  return (
    <>
      <div className="space-y-4">
        {/* Barra única: empleado a la izquierda; alertas, captura y página a la derecha. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0">
            {nombreEmpleado ? <p className="truncate text-label-sm text-foreground">{nombreEmpleado}</p> : <Skeleton className="mb-1 h-4 w-48" />}
            <p className="text-body-sm tabular-nums text-muted-foreground">#{numeroEmpleado}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {vencidos > 0 && <Badge variant="destructive" size="sm" className="tabular-nums">{vencidos} {vencidos === 1 ? "revisión vencida" : "revisiones vencidas"}</Badge>}
            {canCapturePlantilla && (
              <Button type="button" size="sm" className="touch-target" onClick={() => { setForm(blankForm()); setShowForm(true) }}>
                <Plus aria-hidden="true" /> Nuevo registro
              </Button>
            )}
            <CompactPager label="Paginación de actas" page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2" role="status" aria-label="Cargando actas">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-(--control-height) w-full" />)}
          </div>
        ) : records.length === 0 ? (
          <p className="rounded-xl border border-dashed px-(--card-padding) py-12 text-center text-body-md text-muted-foreground">
            No hay actas administrativas para este empleado.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table className="table-fixed">
              <caption className="sr-only">Actas administrativas de {nombreEmpleado ?? `#${numeroEmpleado}`}</caption>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col" className={HEAD}>Descripción</TableHead>
                  <TableHead scope="col" className={cn(HEAD, "hidden w-28 sm:table-cell")}>Fecha</TableHead>
                  <TableHead scope="col" className={cn(HEAD, "hidden w-28 sm:table-cell")}>Revisión</TableHead>
                  <TableHead scope="col" className={cn(HEAD, "w-32")}>Estatus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRecords.map(acta => (
                  <TableRow key={acta.id} className="cursor-pointer" onClick={() => setSelectedId(acta.id)}>
                    <TableCell>
                      <button type="button" onClick={event => { event.stopPropagation(); setSelectedId(acta.id) }}
                        className="block w-full truncate rounded-sm text-left text-label-sm text-foreground">
                        {acta.descripcion || "Sin descripción"}
                      </button>
                      <span className="block truncate text-body-sm tabular-nums text-muted-foreground sm:hidden">
                        {formatDate(acta.fecha)}{acta.fecha_seguimiento && <> · Revisión <RevisionFecha acta={acta} /></>}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-body-sm tabular-nums text-muted-foreground sm:table-cell">
                      <time dateTime={acta.fecha}>{formatDate(acta.fecha)}</time>
                    </TableCell>
                    <TableCell className="hidden text-body-sm sm:table-cell"><RevisionFecha acta={acta} /></TableCell>
                    <TableCell><EstatusBadge estatus={acta.estatus} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {selected && (
        <ActaDetalle acta={selected} canEdit={canCapturePlantilla} canDelete={canEdit}
          onClose={() => setSelectedId(null)} onChangeEstatus={handleChangeEstatus} onDelete={handleDelete} />
      )}

      <ResponsiveShell open={showForm} onClose={closeForm} title="Nueva acta administrativa" description={nombreEmpleado ?? `#${numeroEmpleado}`} size="sm">
        <ModalHeader title="Nueva acta administrativa" onClose={closeForm} />
        <form id={formId} onSubmit={event => { event.preventDefault(); void handleSave() }}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-(--card-padding)">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={`${formId}-fecha`}>Fecha <span aria-hidden="true">*</span><span className="sr-only"> (obligatoria)</span></Label>
              <DateTextInput id={`${formId}-fecha`} required value={form.fecha}
                onValueChange={fecha => setForm(f => ({ ...f, fecha }))} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={`${formId}-fecha-seguimiento`}>Fecha de revisión</Label>
              <DateTextInput id={`${formId}-fecha-seguimiento`} value={form.fecha_seguimiento}
                onValueChange={fecha_seguimiento => setForm(f => ({ ...f, fecha_seguimiento }))} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={`${formId}-estatus`}>Estatus</Label>
              <EstatusSelect id={`${formId}-estatus`} value={form.estatus} onChange={estatus => setForm(f => ({ ...f, estatus }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-descripcion`}>Descripción o motivo</Label>
            <Textarea id={`${formId}-descripcion`} value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Describe brevemente el motivo o los compromisos acordados…" className="min-h-24" />
          </div>
        </form>
        <ModalFooter onCancel={closeForm} onConfirm={() => void handleSave()} saving={saving} />
      </ResponsiveShell>
    </>
  )
}
