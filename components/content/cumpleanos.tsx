"use client"

import { useMemo, useState, type ReactNode } from "react"
import { AlertCircle, Cake, Loader2, Plus, RefreshCw, Search, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { CompactPager } from "@/components/ui/compact-pager"
import { HeaderSearch } from "@/components/ui/header-search"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CumpleanosRegistroDialog } from "@/components/content/cumpleanos-registro-dialog"
import {
  BIRTHDAY_LOOKAHEAD_DAYS,
  BIRTHDAY_PERIODS,
  BIRTHDAY_YEAR_DAYS,
  birthdayEntryKey,
} from "@/lib/cumpleanos"
import { useCumpleanos } from "@/lib/hooks/useCumpleanos"
import type { CumpleanosEntry } from "@/lib/hooks/useCumpleanos"
import { useRole } from "@/lib/hooks/useRole"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"

const DATE_FORMATTER = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
})

const PAGE_SIZE = 8

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .trim()
}

function parseIsoDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function formatBirthday(iso: string) {
  return DATE_FORMATTER.format(parseIsoDate(iso))
}

const HEAD = "whitespace-nowrap text-eyebrow uppercase"

interface BirthdayTableProps {
  label: string
  /** Solo la primera tabla muestra encabezados; las siguientes los dejan para lectores de pantalla. */
  showHead: boolean
  entries: CumpleanosEntry[]
  canEdit: boolean
  selectedIds: Set<string>
  sendingId: string | null
  onToggle: (key: string) => void
  onSend: (entry: CumpleanosEntry) => Promise<void>
}

/** Etiqueta accesible del botón de envío según el caso de la persona. */
function sendLabel(entry: CumpleanosEntry) {
  if (entry.diasParaCumpleanios > BIRTHDAY_LOOKAHEAD_DAYS) return `Enviar felicitación atrasada a ${entry.nombre}`
  if (entry.yaEnviado) return `Reenviar felicitación a ${entry.nombre}`
  if (!entry.email) return `${entry.nombre} no tiene correo registrado`
  return `Enviar felicitación a ${entry.nombre}`
}

/**
 * Un periodo (Hoy, Próximos 7 días…): rótulo con su total y una tabla. Cada periodo
 * es su propia tabla para no usar filas que abarquen columnas ocultas en móvil.
 */
function BirthdayTable({ label, showHead, entries, canEdit, selectedIds, sendingId, onToggle, onSend }: BirthdayTableProps) {
  return (
    <section aria-label={label} className="space-y-2">
      <p className="flex items-center gap-2 text-eyebrow uppercase text-muted-foreground">
        {label}<span className="tabular-nums">· {entries.length}</span>
      </p>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table className="table-fixed">
          {/* Anchos en colgroup: todas las tablas alinean sus columnas aunque solo la primera muestre encabezados. */}
          <colgroup>
            {canEdit && <col className="w-12" />}
            <col />
            <col className="hidden w-44 sm:table-column" />
            <col className="hidden w-28 md:table-column" />
            {canEdit && <col className="w-14" />}
          </colgroup>
          <TableHeader className={showHead ? "bg-muted/50" : "sr-only"}>
            <TableRow className="hover:bg-transparent">
              {canEdit && <TableHead className="px-1"><span className="sr-only">Seleccionar</span></TableHead>}
              <TableHead className={HEAD}>Colaborador</TableHead>
              <TableHead className={cn(HEAD, "hidden sm:table-cell")}>Cumpleaños</TableHead>
              <TableHead className={cn(HEAD, "hidden md:table-cell")}>Estado</TableHead>
              {canEdit && <TableHead className="px-1"><span className="sr-only">Enviar</span></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const key = birthdayEntryKey(entry)
              const selected = selectedIds.has(key)
              const selectable = Boolean(entry.email) && !entry.yaEnviado && entry.diasParaCumpleanios <= BIRTHDAY_LOOKAHEAD_DAYS
              const sending = sendingId === key
              const fecha = formatBirthday(entry.fechaCumpleanios)
              return (
                <TableRow key={key} data-state={selected ? "selected" : undefined}>
                  {canEdit && (
                    <TableCell className="px-1 text-center">
                      <Checkbox checked={selected} onCheckedChange={() => onToggle(key)} disabled={!selectable}
                        aria-label={`Seleccionar a ${entry.nombre}`} />
                    </TableCell>
                  )}
                  <TableCell>
                    <span className="block truncate text-label-sm text-foreground">{entry.nombre}</span>
                    {/* En móvil el detalle es la fecha; desde sm, el número y el correo. */}
                    <span className="block truncate text-body-sm text-muted-foreground sm:hidden">
                      {fecha} · {entry.edad} años{entry.yaEnviado ? " · Enviado" : ""}
                    </span>
                    <span className="hidden truncate text-body-sm text-muted-foreground sm:block">
                      {[entry.numero && `#${entry.numero}`, entry.email || "Sin correo registrado"].filter(Boolean).join(" · ")}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="block truncate text-body-sm text-foreground">{fecha}</span>
                    <span className="block truncate text-body-sm text-muted-foreground">{entry.edad} años</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {entry.yaEnviado
                      ? <Badge variant="success" size="sm">Enviado</Badge>
                      : <span className="text-body-sm text-muted-foreground">{entry.email ? "Por enviar" : "Sin correo"}</span>}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="px-1 text-center">
                      <Button variant="ghost" size="icon" disabled={!entry.email || sending} onClick={() => onSend(entry)} aria-label={sendLabel(entry)}>
                        {sending ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send aria-hidden="true" />}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

function LoadingState() {
  return (
    <div className="space-y-2" role="status" aria-label="Cargando cumpleaños">
      {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-(--control-height) w-full" />)}
    </div>
  )
}

/** Estado vacío con la forma de las demás vistas. */
function EmptyState({ icon: Icon, title, text, action }: { icon: typeof Cake; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-(--card-padding) py-12 text-center">
      <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-label-sm text-foreground">{title}</p>
      <p className="text-body-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  )
}

interface SendResponse {
  exitosos: number
  total: number
  resultados: Array<{ nombre: string; ok: boolean; error?: string }>
  error?: string
}

export default function CumpleanosContent() {
  const { canEdit } = useRole()
  const { loading, error, todos, recargar } = useCumpleanos(BIRTHDAY_YEAR_DAYS)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sendingBulk, setSendingBulk] = useState(false)
  const [registroOpen, setRegistroOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")

  const upcomingEntries = useMemo(
    () => todos.filter((entry) => entry.diasParaCumpleanios <= BIRTHDAY_LOOKAHEAD_DAYS),
    [todos],
  )

  const filteredEntries = useMemo(() => {
    const query = normalizeSearchValue(searchQuery)
    if (!query) return upcomingEntries

    return todos.filter((entry) =>
      normalizeSearchValue(
        [entry.nombre, entry.numero, entry.email]
          .filter(Boolean)
          .join(" "),
      ).includes(query),
    )
  }, [searchQuery, todos, upcomingEntries])

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageEntries = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredEntries.slice(start, start + PAGE_SIZE)
  }, [filteredEntries, safePage])

  const selectable = useMemo(
    () =>
      pageEntries.filter(
        (entry) =>
          entry.email &&
          !entry.yaEnviado &&
          entry.diasParaCumpleanios <= BIRTHDAY_LOOKAHEAD_DAYS,
      ),
    [pageEntries],
  )
  const allSelected =
    selectable.length > 0 && selectable.every((entry) => selectedIds.has(birthdayEntryKey(entry)))
  const selectedCount = selectable.filter((entry) => selectedIds.has(birthdayEntryKey(entry))).length

  function toggleSelection(key: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds(
      allSelected ? new Set() : new Set(selectable.map((entry) => birthdayEntryKey(entry))),
    )
  }

  function handlePageChange(nextPage: number) {
    setSelectedIds(new Set())
    setPage(nextPage)
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value)
    setSelectedIds(new Set())
    setPage(1)
  }

  async function sendRecords(entries: CumpleanosEntry[], manualOverride = false) {
    const response = await fetch("/api/cumpleanos/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        registros: entries.map(({ id, tabla, yaEnviado }) => ({
          id,
          tabla,
          permitirReenvio: manualOverride && yaEnviado,
          permitirFueraDePeriodo: manualOverride,
        })),
      }),
    })
    const payload = (await response.json()) as SendResponse
    if (!response.ok) throw new Error(payload.error ?? "No se pudo completar el envío")
    return payload
  }

  async function handleSendOne(entry: CumpleanosEntry) {
    const key = birthdayEntryKey(entry)
    setSendingId(key)
    try {
      const result = await sendRecords([entry], true)
      if (result.exitosos === 1) {
        notify.success(`Felicitación enviada a ${entry.nombre.split(" ")[0]}`)
        setSelectedIds((current) => {
          const next = new Set(current)
          next.delete(key)
          return next
        })
        await recargar()
      } else {
        notify.error(result.resultados[0]?.error ?? "No se pudo enviar la felicitación")
      }
    } catch (sendError) {
      notify.error(sendError instanceof Error ? sendError.message : "No se pudo enviar la felicitación")
    } finally {
      setSendingId(null)
    }
  }

  async function handleSendSelected() {
    const selected = selectable.filter((entry) => selectedIds.has(birthdayEntryKey(entry)))
    if (!selected.length) return

    setSendingBulk(true)
    try {
      const result = await sendRecords(selected)
      if (result.exitosos === result.total) {
        notify.success(`${result.exitosos} correos enviados`)
      } else if (result.exitosos === 0) {
        notify.error(result.resultados.find((item) => !item.ok)?.error ?? "No se pudo enviar el correo")
      } else {
        const firstError = result.resultados.find((item) => !item.ok)?.error
        notify.warning(
          `${result.exitosos} de ${result.total} correos enviados${firstError ? `. ${firstError}` : ""}`,
        )
      }
      setSelectedIds(new Set())
      await recargar()
    } catch (sendError) {
      notify.error(sendError instanceof Error ? sendError.message : "No se pudo completar el envío")
    } finally {
      setSendingBulk(false)
    }
  }

  if (loading) return <LoadingState />

  if (error) {
    return (
      <Card role="alert">
        <CardContent className="flex flex-col items-start gap-4 p-(--card-padding) sm:flex-row sm:items-center">
          <AlertCircle className="size-5 shrink-0 text-destructive" aria-hidden="true" />
          <p className="flex-1 text-body-md">No se pudo cargar la información de cumpleaños.</p>
          <Button variant="outline" size="sm" onClick={() => void recargar()}>
            <RefreshCw aria-hidden="true" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  const periodGroups = [
    {
      ...BIRTHDAY_PERIODS[0],
      entries: pageEntries.filter((entry) => entry.diasParaCumpleanios === 0),
    },
    {
      ...BIRTHDAY_PERIODS[1],
      entries: pageEntries.filter(
        (entry) => entry.diasParaCumpleanios >= 1 && entry.diasParaCumpleanios <= 7,
      ),
    },
    {
      ...BIRTHDAY_PERIODS[2],
      entries: pageEntries.filter(
        (entry) => entry.diasParaCumpleanios >= 8 && entry.diasParaCumpleanios <= 30,
      ),
    },
    {
      ...BIRTHDAY_PERIODS[3],
      entries: pageEntries.filter(
        (entry) =>
          entry.diasParaCumpleanios >= 31 &&
          entry.diasParaCumpleanios <= BIRTHDAY_LOOKAHEAD_DAYS,
      ),
    },
  ]
  const periods = searchQuery.trim()
    ? [
        {
          key: "resultados",
          label: "Resultados",
          entries: pageEntries,
        },
      ]
    : periodGroups

  return (
    <div className="space-y-4">
      {/* La búsqueda va en el header (lupa). Barra: crear a la izquierda; envío, selección y
          página a la derecha. "Nuevo cumpleaños" queda solo con ícono en anchos chicos. */}
      <HeaderSearch value={searchQuery} onValueChange={handleSearchChange} label="Buscar por nombre, número o correo"
        placeholder="Buscar colaborador" />
      <div className="@container">
      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <Button size="sm" onClick={() => setRegistroOpen(true)} aria-label="Nuevo cumpleaños">
            <Plus aria-hidden="true" />
            <span className="hidden @xl:inline">Nuevo cumpleaños</span>
          </Button>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {selectedCount > 0 && (
            <Button size="sm" disabled={sendingBulk} onClick={() => void handleSendSelected()}>
              {sendingBulk ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send aria-hidden="true" />}
              Enviar {selectedCount} {selectedCount === 1 ? "correo" : "correos"}
            </Button>
          )}
          {canEdit && selectable.length > 0 && (
            <label className="flex min-h-(--control-height) shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md px-2 text-body-md text-foreground">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Seleccionar todos los colaboradores disponibles" />
              <span aria-live="polite">{selectedCount > 0 ? `${selectedCount} seleccionados` : "Seleccionar todos"}</span>
            </label>
          )}
          <CompactPager label="Paginación de cumpleaños" page={safePage} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      </div>
      </div>

      {upcomingEntries.length === 0 && !searchQuery.trim() ? (
        <EmptyState icon={Cake} title="Sin cumpleaños próximos"
          text={`No hay registros dentro de los próximos ${BIRTHDAY_LOOKAHEAD_DAYS} días.`}
          action={canEdit && <Button variant="outline" size="sm" onClick={() => setRegistroOpen(true)}>Nuevo cumpleaños</Button>} />
      ) : filteredEntries.length === 0 ? (
        <EmptyState icon={Search} title="Sin resultados"
          text={`No encontramos colaboradores que coincidan con “${searchQuery.trim()}”.`}
          action={<Button variant="outline" size="sm" onClick={() => handleSearchChange("")}>Limpiar búsqueda</Button>} />
      ) : (
        <div className="space-y-4">
          {periods.filter((period) => period.entries.length > 0).map((period, index) => (
            <BirthdayTable
              key={period.key}
              label={period.label}
              showHead={index === 0}
              entries={period.entries}
              canEdit={canEdit}
              selectedIds={selectedIds}
              sendingId={sendingId}
              onToggle={toggleSelection}
              onSend={handleSendOne}
            />
          ))}
        </div>
      )}

      {canEdit && (
        <CumpleanosRegistroDialog
          open={registroOpen}
          onOpenChange={setRegistroOpen}
          onSaved={() => void recargar()}
        />
      )}
    </div>
  )
}
