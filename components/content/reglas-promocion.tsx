"use client"

import { useMemo, useState } from "react"
import { EllipsisVertical, PencilLine, Plus, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { confirm } from "@/components/ui/confirm-dialog"
import { ReadOnlyBanner } from "@/components/read-only-banner"
import { useRole } from "@/lib/hooks"
import { useReglasPromocionCRUD, type ReglaPromocionRow } from "@/lib/hooks/useReglasPromocionCRUD"
import { cn } from "@/lib/utils"
import { PromReglaDialog } from "./prom-regla-dialog"

/** Criterios mínimos de cada regla, en el orden en que se evalúan. */
const CRITERIOS: { label: string; valor: (regla: ReglaPromocionRow) => string; resumen: (valor: string) => string }[] = [
  { label: "Meses", valor: regla => String(regla.min_temporalidad_meses), resumen: valor => `${valor} meses` },
  { label: "Examen", valor: regla => String(Number(regla.min_calificacion_examen)), resumen: valor => `Examen ${valor}` },
  { label: "Cursos", valor: regla => `${Number(regla.min_porcentaje_cursos)}%`, resumen: valor => `Cursos ${valor}` },
  { label: "Evaluación", valor: regla => String(Number(regla.min_calificacion_evaluacion)), resumen: valor => `Eval. ${valor}` },
]

interface AccionesProps {
  regla: ReglaPromocionRow
  disabled: boolean
  onEdit: (regla: ReglaPromocionRow) => void
  onDelete: (regla: ReglaPromocionRow) => void
}

function ReglaMenu({ regla, disabled, onEdit, onDelete }: AccionesProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={`Acciones para ${regla.puesto}`}>
          <EllipsisVertical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onEdit(regla)}><PencilLine aria-hidden="true" />Editar</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onDelete(regla)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
          <Trash2 aria-hidden="true" />Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Destino({ regla }: { regla: ReglaPromocionRow }) {
  return regla.promocion_a
    ? <>{regla.promocion_a}</>
    : <span className="text-muted-foreground">Sin promoción</span>
}

function ReglasSkeleton() {
  return (
    <div role="status" aria-label="Cargando reglas" className="overflow-hidden rounded-xl border border-border">
      {[0, 1, 2, 3, 4].map(row => (
        <div key={row} aria-hidden="true" className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="ml-auto h-4 w-1/5" />
        </div>
      ))}
    </div>
  )
}

/**
 * Reglas de promoción: de qué puesto a cuál se promueve y con qué mínimos.
 * Tabla en tablet y escritorio; lista compacta en celular.
 */
export default function ReglasPromocionContent() {
  const { isReadOnly } = useRole()
  const { reglas, loading, error, guardar, eliminar, toggleActivo } = useReglasPromocionCRUD()
  const [filter, setFilter] = useState("")
  const [dialog, setDialog] = useState<{ regla: ReglaPromocionRow | null } | null>(null)

  const filtered = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase("es-MX")
    if (!query) return reglas
    return reglas.filter(regla => regla.puesto.toLocaleLowerCase("es-MX").includes(query)
      || (regla.promocion_a?.toLocaleLowerCase("es-MX").includes(query) ?? false))
  }, [filter, reglas])
  const inactivas = reglas.filter(regla => !regla.activo).length

  async function handleDelete(regla: ReglaPromocionRow) {
    const ok = await confirm({
      title: "Eliminar regla",
      description: `Se eliminará la regla de «${regla.puesto}». Esta acción no se puede deshacer.`,
      tone: "destructive",
      confirmLabel: "Eliminar",
    })
    if (!ok) return
    // El hook ya avisa si falla.
    await eliminar(regla.id).catch(() => undefined)
  }

  function toggle(regla: ReglaPromocionRow, activo: boolean) {
    void toggleActivo(regla.id, activo).catch(() => undefined)
  }

  const acciones = (regla: ReglaPromocionRow) => (
    <ReglaMenu regla={regla} disabled={isReadOnly} onEdit={item => setDialog({ regla: item })} onDelete={item => void handleDelete(item)} />
  )
  const activa = (regla: ReglaPromocionRow) => (
    <Switch checked={regla.activo} onCheckedChange={value => toggle(regla, value)} disabled={isReadOnly}
      aria-label={`Regla de ${regla.puesto} ${regla.activo ? "activa" : "inactiva"}`} />
  )

  return (
    <div className="grid gap-4">
      <ReadOnlyBanner />

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" placeholder="Buscar puesto" aria-label="Buscar regla por puesto" className="pl-9"
            value={filter} onChange={event => setFilter(event.target.value)} />
        </div>
        <Button type="button" className="ml-auto shrink-0 max-sm:w-11 max-sm:px-0" disabled={isReadOnly}
          onClick={() => setDialog({ regla: null })}>
          <Plus aria-hidden="true" /><span className="max-sm:sr-only">Nueva regla</span>
        </Button>
      </div>

      {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-body-md text-destructive">{error}</p>}

      {loading ? (
        <ReglasSkeleton />
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-body-md text-muted-foreground">
          {reglas.length === 0 ? "Aún no hay reglas. Crea la primera o impórtalas desde Categorías." : `Ninguna regla coincide con «${filter.trim()}».`}
        </p>
      ) : (
        <>
          {/* Tablet y escritorio */}
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <Table className="[&_td]:px-3 [&_td]:py-2 [&_th]:h-(--table-head-height) [&_th]:px-3 [&_th]:text-body-sm">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col">Puesto</TableHead>
                  <TableHead scope="col">Promoción a</TableHead>
                  {CRITERIOS.map(criterio => <TableHead key={criterio.label} scope="col" className="w-24 text-right">{criterio.label}</TableHead>)}
                  <TableHead scope="col" className="w-20 text-center">Activa</TableHead>
                  <TableHead scope="col" className="w-14"><span className="sr-only">Acciones</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(regla => (
                  <TableRow key={regla.id} className={cn(!regla.activo && "text-muted-foreground")}>
                    <TableCell className="text-label-sm">{regla.puesto}</TableCell>
                    <TableCell className="text-body-md text-muted-foreground"><Destino regla={regla} /></TableCell>
                    {CRITERIOS.map(criterio => (
                      <TableCell key={criterio.label} className="text-right text-body-md tabular-nums">{criterio.valor(regla)}</TableCell>
                    ))}
                    <TableCell className="text-center">{activa(regla)}</TableCell>
                    <TableCell className="text-right">{acciones(regla)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Celular: una fila por regla, mínimos en una línea */}
          <ul className="divide-y divide-border rounded-xl border border-border bg-card md:hidden">
            {filtered.map(regla => (
              <li key={regla.id} className={cn("flex items-start gap-2 py-3 pl-4 pr-1", !regla.activo && "text-muted-foreground")}>
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <p className="break-words text-label-sm">{regla.puesto}</p>
                  <p className="break-words text-body-sm text-muted-foreground"><span aria-hidden="true">→ </span><Destino regla={regla} /></p>
                  <p className="text-body-sm tabular-nums text-muted-foreground">
                    {CRITERIOS.map(criterio => criterio.resumen(criterio.valor(regla))).join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 pt-1">
                  {activa(regla)}
                  {acciones(regla)}
                </div>
              </li>
            ))}
          </ul>

          <p className="text-body-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "regla" : "reglas"}
            {inactivas > 0 && ` · ${inactivas} ${inactivas === 1 ? "inactiva" : "inactivas"}`}
          </p>
        </>
      )}

      {dialog && (
        <PromReglaDialog open regla={dialog.regla} existingPuestos={reglas.map(regla => regla.puesto)}
          isReadOnly={isReadOnly} onClose={() => setDialog(null)} onGuardar={guardar} />
      )}
    </div>
  )
}
