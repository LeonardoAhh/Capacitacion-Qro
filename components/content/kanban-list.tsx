"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  KanbanApoyo, KanbanBloqueo, KanbanFechas, KanbanPersonas, KanbanPrioridadFlag, KanbanTarjetaMenu, KanbanTipoLabel,
  useKanbanAcciones,
} from "@/components/content/kanban-meta"
import { etiquetaEstado, type KanbanMiembro, type KanbanTarjeta } from "@/lib/kanban"

interface KanbanListProps {
  /** Ya ordenadas (por columna y dentro de cada columna). */
  tarjetas: KanbanTarjeta[]
  miembros: Map<string, KanbanMiembro>
}

/** Vista de lista: una fila por tarjeta, con las mismas piezas que la vista de tablero. */
export function KanbanList({ tarjetas, miembros }: KanbanListProps) {
  const { ver } = useKanbanAcciones()
  if (tarjetas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center">
        <p className="text-body-md text-muted-foreground">Sin tarjetas en el tablero.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Table aria-label="Tarjetas" className="min-w-[48rem] [&_td]:px-3 [&_td]:py-2 [&_th]:h-(--table-head-height) [&_th]:px-3 [&_th]:text-body-sm">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col">Tarjeta</TableHead>
            <TableHead scope="col" className="w-32">Tipo</TableHead>
            <TableHead scope="col" className="w-32">Estado</TableHead>
            <TableHead scope="col" className="w-24">Prioridad</TableHead>
            <TableHead scope="col" className="w-44">Responsable</TableHead>
            <TableHead scope="col" className="w-40">Fechas</TableHead>
            <TableHead scope="col" className="w-14"><span className="sr-only">Acciones</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tarjetas.map(tarjeta => {
            const responsable = tarjeta.responsable_id ? miembros.get(tarjeta.responsable_id) ?? null : null
            return (
              <TableRow key={tarjeta.id}>
                <TableCell className="max-w-md">
                  <span className="flex min-w-0 items-center gap-2">
                    <button type="button" onClick={() => ver(tarjeta)}
                      className={cn(
                        "line-clamp-1 min-w-0 break-words rounded-sm text-left text-label-sm",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        tarjeta.estado === "concluido" ? "text-muted-foreground" : "text-foreground",
                      )}>
                      {tarjeta.titulo}
                    </button>
                    <KanbanApoyo tarjeta={tarjeta} />
                  </span>
                  {tarjeta.estado !== "concluido" && <KanbanBloqueo tarjeta={tarjeta} />}
                  {tarjeta.descripcion && (
                    <p className="line-clamp-1 text-body-sm text-muted-foreground">{tarjeta.descripcion}</p>
                  )}
                </TableCell>
                <TableCell><KanbanTipoLabel tipo={tarjeta.tipo} /></TableCell>
                <TableCell className="text-body-md text-foreground">{etiquetaEstado(tarjeta.estado)}</TableCell>
                <TableCell><KanbanPrioridadFlag prioridad={tarjeta.prioridad} /></TableCell>
                <TableCell>
                  {responsable ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <KanbanPersonas tarjeta={tarjeta} miembros={miembros} />
                      <span aria-hidden="true" className="truncate text-body-md text-foreground">{responsable.nombre}</span>
                    </span>
                  ) : <span className="text-body-sm text-muted-foreground">Sin asignar</span>}
                </TableCell>
                <TableCell>
                  <KanbanFechas tarjeta={tarjeta} />
                </TableCell>
                <TableCell className="text-right">
                  <KanbanTarjetaMenu tarjeta={tarjeta} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
