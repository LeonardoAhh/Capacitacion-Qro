"use client"

import { ArrowLeft, EllipsisVertical, Pencil, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { LIST_WITH_DETAIL_GRID } from "@/components/ui/side-detail-panel"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ATENCIONES, TONO_RIESGO, type Accidente } from "@/lib/salud-ocupacional"
import { cn } from "@/lib/utils"
import { AccidentePanel } from "./accidente-panel"

const HEAD = "whitespace-nowrap text-eyebrow uppercase"
const siNo = (value: boolean) => value ? "Sí" : "No"

/** Columnas que se ocultan cuando el panel de detalle ocupa el lado derecho (como Safe Walk). */
function columnas(narrow: boolean) {
  return {
    riesgo: narrow ? "hidden" : "hidden w-20 text-center xl:table-cell",
    reporte: narrow ? "hidden" : "hidden w-24 text-center xl:table-cell",
    // Cabe en una línea con las tres atenciones en su nombre corto.
    atencion: narrow ? "hidden" : "hidden w-72 xl:table-cell",
  }
}

/**
 * Detalle de un día: reemplaza calendario y panel lateral con la tabla de sus accidentes.
 * Clic en una fila abre su detalle a un lado; editar y eliminar desde el menú de cada fila.
 */
export function AccidentesDetalle({ titulo, accidentes, selectedId, side, canEdit, onBack, onSelect, onCreate, onEdit, onDelete }: {
  titulo: string
  accidentes: Accidente[]
  selectedId: string | null
  /** Panel a un lado (lg+) o en hoja inferior. */
  side: boolean
  canEdit: boolean
  onBack: () => void
  onSelect: (id: string | null) => void
  onCreate: () => void
  onEdit: (accidente: Accidente) => void
  onDelete: (accidente: Accidente) => void
}) {
  const seleccionado = accidentes.find(accidente => accidente.id === selectedId) ?? null
  const col = columnas(Boolean(seleccionado) && side)

  return (
    // minmax(0,1fr): la columna no crece con el ancho mínimo de la tabla (en móvil empujaba
    // título, Crear y el modal de detalle fuera de la pantalla).
    <section aria-labelledby="accidentes-detalle-title" className="grid grid-cols-[minmax(0,1fr)] content-start gap-4">
      <header className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground" aria-label="Volver al calendario" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 id="accidentes-detalle-title" className="truncate text-heading-md text-foreground">{titulo}</h2>
          <p className="text-body-sm text-muted-foreground">{accidentes.length} {accidentes.length === 1 ? "accidente registrado" : "accidentes registrados"}</p>
        </div>
        {canEdit && (
          <Button type="button" className="shrink-0" aria-label="Registrar accidente en este día" onClick={onCreate}>
            <Plus aria-hidden="true" /><span className="hidden sm:inline">Registrar</span>
          </Button>
        )}
      </header>

      <div className={seleccionado && side ? LIST_WITH_DETAIL_GRID : undefined}>
        <Card className="min-w-0 overflow-hidden">
          <Table className="table-fixed">
            <caption className="sr-only">Accidentes del {titulo}; elige uno para ver su detalle</caption>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                {/* Móvil: solo el colaborador (el relato está en su detalle). Desde sm, proporcional:
                    el nombre completo cabe y «¿Qué ocurrió?» toma el resto. */}
                <TableHead scope="col" className={cn(HEAD, "sm:w-1/2 xl:w-1/3")}>Colaborador</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden sm:table-cell")}>¿Qué ocurrió?</TableHead>
                <TableHead scope="col" className={cn(HEAD, col.riesgo)}>Riesgo</TableHead>
                <TableHead scope="col" className={cn(HEAD, col.reporte)}>Reporte</TableHead>
                <TableHead scope="col" className={cn(HEAD, col.atencion)}>Atención</TableHead>
                {canEdit && <TableHead className="w-14 px-1"><span className="sr-only">Acciones</span></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {accidentes.map(accidente => {
                const selected = accidente.id === seleccionado?.id
                const atenciones = ATENCIONES.filter(atencion => accidente.atenciones.includes(atencion.value))
                return (
                  <TableRow key={accidente.id} data-state={selected ? "selected" : undefined} className="cursor-pointer" onClick={() => onSelect(accidente.id)}>
                    <TableCell>
                      {/* El botón da acceso con teclado; toda la fila también responde al clic. */}
                      <button type="button" aria-current={selected || undefined}
                        className="block w-full min-w-0 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        onClick={event => { event.stopPropagation(); onSelect(accidente.id) }}>
                        <span className="block truncate text-label-sm text-foreground">{accidente.colaborador}</span>
                        <span className="block truncate text-body-sm tabular-nums text-muted-foreground">#{accidente.numeroEmpleado}</span>
                      </button>
                    </TableCell>
                    <TableCell className="hidden truncate text-body-sm text-foreground sm:table-cell">{accidente.descripcion}</TableCell>
                    <TableCell className={cn(col.riesgo, "text-body-sm")}>
                      {accidente.riesgoTrabajo
                        ? <span className="inline-flex items-center gap-1.5 text-foreground"><span aria-hidden="true" className={cn("size-2 rounded-sm", TONO_RIESGO.dot)} />Sí</span>
                        : <span className="text-muted-foreground">No</span>}
                    </TableCell>
                    <TableCell className={cn(col.reporte, "text-body-sm")}>{siNo(accidente.reporteGenerado)}</TableCell>
                    <TableCell className={col.atencion}>
                      {atenciones.length
                        ? <span className="flex gap-1 whitespace-nowrap">
                            <span className="sr-only">{atenciones.map(atencion => atencion.label).join(", ")}</span>
                            {atenciones.map(atencion => (
                              <Badge key={atencion.value} variant="outline" size="sm" aria-hidden="true" className={cn("font-normal", atencion.chip)}>
                                <span className={cn("size-1.5 shrink-0 rounded-sm", atencion.dot)} />
                                {atencion.corto}
                              </Badge>
                            ))}
                          </span>
                        : <span className="text-body-sm text-muted-foreground">Sin atención</span>}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="px-1 py-0 text-center" onClick={event => event.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label={`Acciones del accidente de ${accidente.colaborador}`}>
                              <EllipsisVertical aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => onEdit(accidente)}><Pencil aria-hidden="true" />Editar</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onDelete(accidente)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                              <Trash2 aria-hidden="true" />Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>

        {seleccionado && (
          <AccidentePanel key={seleccionado.id} accidente={seleccionado} side={side} onClose={() => onSelect(null)} />
        )}
      </div>
    </section>
  )
}
