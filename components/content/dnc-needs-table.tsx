"use client"

import { useState } from "react"
import { CircleCheck, CircleDashed, CircleX, EllipsisVertical, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TruncatedText } from "@/components/ui/truncated-text"
import { cn } from "@/lib/utils"
import { MESES } from "@/lib/plan-anual"
import { nombreEquipoDnc, type DncNecesidad, type DncPosition } from "@/lib/dnc"
import { rangoDelMes, type TarjetaDesde } from "@/lib/kanban"
import { KanbanCrearDesdeItem } from "@/components/content/kanban-crear-desde"

interface DncNeedsTableProps {
  necesidades: DncNecesidad[]
  puestos: DncPosition[]
  departmentName: string
  /** Año del reporte: ubica el mes sugerido al crear una tarjeta. */
  anio: number
  canEdit: boolean
  onEdit: (necesidad: DncNecesidad) => void
  onDelete: (necesidad: DncNecesidad) => void
}

type TextColumn = "necesidad" | "curso_nombre" | "puestos" | "funcion_actividad" | "motivo" | "beneficio"

/**
 * Columnas de texto con ancho proporcional: la tabla ocupa el ancho disponible sin scroll
 * horizontal en escritorio. El contenido se recorta y se abre completo en un diálogo.
 * `label` es el encabezado corto; `fullLabel`, el nombre completo del campo para el diálogo.
 */
const TEXT_COLUMNS: { key: TextColumn; label: string; fullLabel: string; width: string }[] = [
  { key: "necesidad", label: "Necesidad", fullLabel: "Necesidad identificada", width: "w-[13%]" },
  { key: "curso_nombre", label: "Curso", fullLabel: "Nombre del curso", width: "w-[13%]" },
  { key: "puestos", label: "Puestos", fullLabel: "Puestos con la necesidad", width: "w-[13%]" },
  { key: "funcion_actividad", label: "Función o actividad", fullLabel: "Función o actividad relacionada", width: "w-[15%]" },
  { key: "motivo", label: "Motivo", fullLabel: "Motivo de la necesidad", width: "w-[15%]" },
  { key: "beneficio", label: "Beneficio", fullLabel: "Beneficio para el área o empresa", width: "w-[15%]" },
]

// La primera columna y las acciones quedan fijas al desplazar horizontalmente (desde md).
const PINNED_START = "bg-card md:sticky md:left-0 md:z-10"
const PINNED_END = "bg-card md:sticky md:right-0 md:z-10 border-l"
// Bordes por celda con border-separate: así las celdas fijas conservan sus líneas al desplazar.
// Densidad compacta: body-sm en celdas y encabezados; en pantallas angostas conserva un ancho mínimo y desplaza.
const TABLE_BASE = "w-full min-w-[60rem] table-fixed border-separate border-spacing-0 [&_td]:border-b [&_th]:border-b [&_tr:last-child>td]:border-b-0 [&_td]:uppercase [&_td]:text-body-sm [&_td]:px-2.5 [&_td]:py-2 [&_td]:align-top [&_th]:h-auto [&_th]:text-body-sm [&_th]:font-medium [&_th]:px-2.5 [&_th]:py-2.5 [&_th]:align-bottom"

// Líneas verticales entre columnas; con acciones, la penúltima no la lleva porque la columna fija trae la suya.
function tableClass(canEdit: boolean) {
  return cn(TABLE_BASE, canEdit ? "[&_tr>:not(:last-child):not(:nth-last-child(2))]:border-r" : "[&_tr>:not(:last-child)]:border-r")
}

interface Detail {
  label: string
  title: string
  content: string | string[]
}

function DncColGroup({ canEdit }: { canEdit: boolean }) {
  return (
    <colgroup>
      {TEXT_COLUMNS.map(column => <col key={column.key} className={column.width} />)}
      <col className="w-[6%]" />
      <col className="w-[5%]" />
      {canEdit && <col className="w-16" />}
    </colgroup>
  )
}

function DncTableHeader({ canEdit }: { canEdit: boolean }) {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        {TEXT_COLUMNS.map((column, index) => (
          <TableHead key={column.key} scope="col" className={cn("whitespace-normal", index === 0 && PINNED_START)}>
            {column.label}
          </TableHead>
        ))}
        <TableHead scope="col" className="whitespace-normal">Mes sugerido</TableHead>
        <TableHead scope="col" className="whitespace-normal">Tipo</TableHead>
        {canEdit && <TableHead scope="col" className={cn("text-right", PINNED_END)}><span className="sr-only">Acciones</span></TableHead>}
      </TableRow>
    </TableHeader>
  )
}

function DncSkeletonRows({ canEdit }: { canEdit: boolean }) {
  return [1, 2, 3].map(number => (
    <TableRow key={number} aria-hidden="true" className="hover:bg-transparent">
      {TEXT_COLUMNS.map((column, index) => (
        <TableCell key={column.key} className={cn(index === 0 && PINNED_START)}>
          <Skeleton className="h-4 w-3/4 animate-none" />
        </TableCell>
      ))}
      <TableCell><Skeleton className="h-4 w-3/4 animate-none" /></TableCell>
      <TableCell><Skeleton className="h-4 w-3/4 animate-none" /></TableCell>
      {canEdit && <TableCell className={PINNED_END}><Skeleton className="ml-auto h-4 w-4 animate-none" /></TableCell>}
    </TableRow>
  ))
}

export function DncTableSkeleton() {
  return (
    <Table aria-label="DNC sin registros" className={tableClass(false)}>
      <DncColGroup canEdit={false} />
      <DncTableHeader canEdit={false} />
      <TableBody>
        <DncSkeletonRows canEdit={false} />
      </TableBody>
    </Table>
  )
}

/**
 * Estado de autorización al inicio del menú de acciones. Solo "No autorizada"
 * es interactivo: abre el motivo en el diálogo de detalle.
 */
function DncAutorizacionEstado({ necesidad, onShowMotivo }: { necesidad: DncNecesidad; onShowMotivo: () => void }) {
  if (necesidad.autorizacion === "no_autorizado") {
    return (
      <DropdownMenuItem onSelect={onShowMotivo} aria-haspopup="dialog" className="items-start py-2">
        <CircleX aria-hidden="true" className="mt-0.5 text-destructive" />
        <span className="grid">
          No autorizada
          <span className="text-body-sm text-muted-foreground">Ver motivo</span>
        </span>
      </DropdownMenuItem>
    )
  }
  const autorizada = necesidad.autorizacion === "autorizado"
  const Icon = autorizada ? CircleCheck : CircleDashed
  return (
    <DropdownMenuLabel className="flex min-h-11 items-center gap-2 py-0 text-body-md">
      <Icon aria-hidden="true" className={cn("size-4 shrink-0", autorizada ? "text-success" : "text-muted-foreground")} />
      {autorizada ? "Autorizada" : "Sin autorización"}
    </DropdownMenuLabel>
  )
}

/** Tarjeta para atender la necesidad durante su mes sugerido. */
function tarjetaDeNecesidad(necesidad: DncNecesidad, departmentName: string, anio: number): TarjetaDesde {
  return {
    titulo: necesidad.curso_nombre,
    descripcion: [`DNC ${anio} · ${departmentName}`, `Necesidad: ${necesidad.necesidad}`].join("\n"),
    ...rangoDelMes(anio, necesidad.mes_sugerido),
  }
}

export function DncNeedsTable({ necesidades, puestos, departmentName, anio, canEdit, onEdit, onDelete }: DncNeedsTableProps) {
  const [detail, setDetail] = useState<Detail | null>(null)
  // El detalle se conserva al cerrar para que la animación de salida no quede vacía.
  const [detailOpen, setDetailOpen] = useState(false)

  function valueOf(necesidad: DncNecesidad, key: TextColumn): string[] | string {
    if (key === "puestos") {
      const allSelected = puestos.length > 0 && puestos.every(puesto => necesidad.position_ids.includes(puesto.id))
      return allSelected
        ? nombreEquipoDnc(departmentName)
        : puestos.filter(puesto => necesidad.position_ids.includes(puesto.id)).map(puesto => puesto.name)
    }
    return necesidad[key]
  }

  return (
    <>
      <Table aria-label="Necesidades de capacitación del departamento" className={tableClass(canEdit)}>
        <DncColGroup canEdit={canEdit} />
        <DncTableHeader canEdit={canEdit} />
        <TableBody>
          {necesidades.length === 0 && <DncSkeletonRows canEdit={canEdit} />}
          {necesidades.map(necesidad => (
            <TableRow key={necesidad.id} className="hover:bg-transparent">
              {TEXT_COLUMNS.map((column, index) => {
                const value = valueOf(necesidad, column.key)
                const text = Array.isArray(value) ? value.join(", ") : value
                return (
                  <TableCell key={column.key} className={cn("whitespace-normal", index === 0 && cn(PINNED_START, "font-medium"))}>
                    <TruncatedText
                      lines={2}
                      expandLabel={`Ver ${column.fullLabel.toLowerCase()} completo`}
                      onExpand={() => {
                        setDetail({ label: column.fullLabel, title: necesidad.curso_nombre, content: value })
                        setDetailOpen(true)
                      }}
                    >
                      {text}
                    </TruncatedText>
                  </TableCell>
                )
              })}
              <TableCell>{MESES[necesidad.mes_sugerido - 1]}</TableCell>
              <TableCell>{necesidad.tipo === "interno" ? "Interna" : "Externa"}</TableCell>
              {canEdit && (
                <TableCell className={cn("text-right", PINNED_END)}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Acciones para ${necesidad.curso_nombre}`}>
                        <EllipsisVertical aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DncAutorizacionEstado necesidad={necesidad} onShowMotivo={() => {
                        setDetail({ label: "Motivo de no autorización", title: necesidad.curso_nombre, content: necesidad.motivo_no_autorizado ?? "" })
                        setDetailOpen(true)
                      }} />
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => onEdit(necesidad)}><Pencil aria-hidden="true" />Editar</DropdownMenuItem>
                      {necesidad.autorizacion !== "no_autorizado" && (
                        <KanbanCrearDesdeItem datos={tarjetaDeNecesidad(necesidad, departmentName, anio)} />
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => onDelete(necesidad)}
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                        <Trash2 aria-hidden="true" />Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {detail && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{detail.label}</DialogTitle>
              <DialogDescription>{detail.title}</DialogDescription>
            </DialogHeader>
            {Array.isArray(detail.content) ? (
              <ul className="divide-y divide-border">
                {detail.content.map(item => <li key={item} className="py-2 text-body-md uppercase text-foreground">{item}</li>)}
              </ul>
            ) : (
              <p className="whitespace-pre-line break-words pb-2 text-body-md uppercase text-foreground">{detail.content}</p>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
