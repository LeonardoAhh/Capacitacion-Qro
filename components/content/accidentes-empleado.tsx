"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { isoATexto } from "@/lib/fechas"
import { cargarAccidentesDeEmpleado, SEVERIDADES, type Accidente } from "@/lib/salud-ocupacional"
import { supabase } from "@/lib/supabase/client"
import { describeSupabaseError } from "@/lib/supabase/errors"
import { cn } from "@/lib/utils"

const HEAD = "whitespace-nowrap text-eyebrow uppercase"

const severidadLabel = (accidente: Accidente) =>
  SEVERIDADES.find(severidad => severidad.value === accidente.severidad)?.label ?? "—"

const incapacidadLabel = (accidente: Accidente) =>
  accidente.incapacidad && accidente.diasIncapacidad
    ? `${accidente.diasIncapacidad} ${accidente.diasIncapacidad === 1 ? "día" : "días"}`
    : "—"

/**
 * Accidentes del empleado en sus Registros, solo lectura: se registran y editan en
 * Occupational Health. Lo ven los roles con canViewEmployeeAccidents (datos médicos).
 */
export function AccidentesEmpleado({ numeroEmpleado }: { numeroEmpleado: string }) {
  const [accidentes, setAccidentes] = useState<Accidente[] | null>(null)
  const [nombre, setNombre] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    cargarAccidentesDeEmpleado(numeroEmpleado)
      .then(rows => { if (active) setAccidentes(rows) })
      .catch(caught => { if (active) setError(describeSupabaseError(caught, "No se pudieron cargar los accidentes")) })
    supabase.from("employees").select("nombre").eq("numero", numeroEmpleado).maybeSingle()
      .then(({ data }) => { if (active) setNombre(data?.nombre ?? null) })
    return () => { active = false }
  }, [numeroEmpleado])

  return (
    <div className="space-y-4">
      {/* Mismo encabezado que los demás apartados de Registros. */}
      <div className="min-w-0">
        {nombre ? <p className="truncate text-label-sm text-foreground">{nombre}</p> : <Skeleton className="mb-1 h-4 w-48" />}
        <p className="text-body-sm tabular-nums text-muted-foreground">#{numeroEmpleado}</p>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border px-(--card-padding) py-3 text-body-md text-destructive">{error}</p>
      ) : !accidentes ? (
        <div role="status" aria-label="Cargando accidentes" className="space-y-2">
          {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} aria-hidden="true" className="h-(--control-height) w-full" />)}
        </div>
      ) : accidentes.length === 0 ? (
        <p className="rounded-xl border border-dashed px-(--card-padding) py-10 text-center text-body-md text-muted-foreground">
          No hay accidentes registrados para este empleado.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table className="table-fixed">
            <caption className="sr-only">Accidentes de {nombre ?? `#${numeroEmpleado}`}</caption>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className={cn(HEAD, "w-28")}>Fecha</TableHead>
                <TableHead scope="col" className={HEAD}>Descripción</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-24 sm:table-cell")}>Severidad</TableHead>
                <TableHead scope="col" className={cn(HEAD, "hidden w-28 text-right sm:table-cell")}>Incapacidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accidentes.map(accidente => (
                <TableRow key={accidente.id}>
                  <TableCell className="text-label-sm tabular-nums text-foreground">
                    <time dateTime={accidente.fecha}>{isoATexto(accidente.fecha)}</time>
                  </TableCell>
                  <TableCell className="text-body-sm text-foreground">
                    <span className="line-clamp-2">{accidente.descripcion}</span>
                    <span className="block text-muted-foreground sm:hidden">
                      {severidadLabel(accidente)} · {incapacidadLabel(accidente)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-body-sm text-muted-foreground sm:table-cell">{severidadLabel(accidente)}</TableCell>
                  <TableCell className="hidden text-right text-body-sm tabular-nums text-muted-foreground sm:table-cell">{incapacidadLabel(accidente)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
