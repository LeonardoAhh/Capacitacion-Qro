"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CompactPager } from "@/components/ui/compact-pager"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { isoATexto } from "@/lib/fechas"
import { enHojas, horasDe, textoHoras, textoJornada, type FilaTE } from "@/lib/formato-te"
import { cn } from "@/lib/utils"

const HEAD = "whitespace-nowrap text-eyebrow uppercase"

interface ListaTEProps {
  filas: readonly FilaTE[]
  onQuitar: (id: string) => void
}

/**
 * Lo capturado, una hoja a la vez (10 empleados, como sale impreso) con ‹ › para cambiar de hoja.
 * Al agregar a alguien se muestra la última hoja, donde quedó.
 */
export function ListaTE({ filas, onQuitar }: ListaTEProps) {
  const hojas = enHojas(filas)
  const [pagina, setPagina] = useState(hojas.length)
  const [conteo, setConteo] = useState(filas.length)
  if (filas.length !== conteo) {
    setConteo(filas.length)
    if (filas.length > conteo) setPagina(hojas.length)
  }
  // Al quitar filas puede desaparecer la hoja abierta: se queda en la última que existe.
  const actual = Math.min(Math.max(1, pagina), hojas.length)

  if (filas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-(--card-padding) py-12 text-center text-body-md text-muted-foreground">
        Escribe un número de empleado para agregarlo.
      </p>
    )
  }

  const hoja = hojas[actual - 1]
  return (
    // @container: las columnas se muestran según el ancho de la lista (a media pantalla junto a la
    // vista previa o completa), no según la pantalla.
    <section aria-labelledby="te-hoja" className="@container overflow-hidden rounded-xl border bg-card">
      <header className="flex min-h-12 items-center justify-between gap-3 border-b py-1 pl-(--card-padding) pr-2">
        <h2 id="te-hoja" className="text-label-sm text-foreground">Hoja {actual}</h2>
        <CompactPager label="Hojas del formato" page={actual} totalPages={hojas.length} onPageChange={setPagina} />
      </header>
      <Table className="table-fixed">
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className={cn(HEAD, "w-20")}>No. Emp</TableHead>
            <TableHead scope="col" className={HEAD}>Empleado</TableHead>
            <TableHead scope="col" className={cn(HEAD, "hidden w-28 @4xl:table-cell")}>Fecha</TableHead>
            <TableHead scope="col" className={cn(HEAD, "hidden w-32 @2xl:table-cell")}>Ordinaria</TableHead>
            <TableHead scope="col" className={cn(HEAD, "w-32")}>Extraordinaria</TableHead>
            <TableHead scope="col" className={cn(HEAD, "w-16 text-right")}>Horas</TableHead>
            <TableHead className="w-14 px-1"><span className="sr-only">Quitar</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hoja.map(fila => {
            const extra = horasDe(fila.extraordinaria)
            return (
              <TableRow key={fila.id}>
                <TableCell className="text-body-sm tabular-nums text-foreground">{fila.numero}</TableCell>
                {/* Solo el nombre: el puesto se ve en la vista previa. */}
                <TableCell className="truncate text-label-sm text-foreground" title={fila.nombre}>{fila.nombre}</TableCell>
                <TableCell className="hidden text-body-sm tabular-nums text-muted-foreground @4xl:table-cell">{isoATexto(fila.fecha)}</TableCell>
                <TableCell className="hidden text-body-sm tabular-nums text-muted-foreground @2xl:table-cell">{textoJornada(fila.ordinaria)}</TableCell>
                <TableCell className="text-body-sm tabular-nums text-foreground">{textoJornada(fila.extraordinaria)}</TableCell>
                <TableCell className="text-right text-body-sm tabular-nums text-foreground">{extra ? textoHoras(extra) : "-"}</TableCell>
                <TableCell className="px-1 py-0 text-center">
                  <Button type="button" variant="ghost" size="sm" className="w-(--control-height-sm) px-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Quitar a ${fila.nombre}`} onClick={() => onQuitar(fila.id)}>
                    <X aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </section>
  )
}
