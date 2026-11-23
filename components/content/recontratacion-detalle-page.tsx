"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Printer } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { RecontratacionPrintData } from "@/components/content/recontratacion-print"
import { evaluarRecomendacion, EVAL_THRESHOLDS } from "@/components/content/recontratacion-logic"
import { Dato, RECO_META } from "@/components/content/recontratacion-ui"
import { formatDate } from "@/lib/hooks"
import { useRecontratacion } from "@/lib/hooks/useRecontratacion"
import { INCIDENCIA_COLUMNS, formatMesLargo } from "@/lib/recontratacion"
import { cn } from "@/lib/utils"

type Estado =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; data: RecontratacionPrintData }

const SECTION_TITLE = "text-eyebrow uppercase text-muted-foreground"
const PANEL = "overflow-x-auto rounded-xl border border-border bg-card"
const TABLE = "[&_td]:px-3 [&_td]:py-2 [&_th]:h-(--table-head-height) [&_th]:px-3 [&_th]:text-body-sm"

function Vacio() {
  return <span className="text-muted-foreground" aria-label="Sin valor">—</span>
}

function RecomendacionBadge({ data }: { data: RecontratacionPrintData }) {
  const meta = RECO_META[evaluarRecomendacion(data)]
  const Icon = meta.icon
  return (
    <Badge variant="outline" className={cn("gap-1.5", meta.classes)}>
      <Icon className="size-4" aria-hidden="true" />
      {meta.label}
    </Badge>
  )
}

function DetalleSkeleton() {
  return (
    <div role="status" aria-label="Cargando revisión" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-72 max-w-full" />
        <Skeleton className="h-4 w-48" />
      </div>
      {[0, 1, 2].map(item => <Skeleton key={item} aria-hidden="true" className="h-40 rounded-xl" />)}
    </div>
  )
}

/**
 * Revisión de continuidad de contrato: datos generales, incidencias de los
 * primeros 90 días y evaluaciones, con la recomendación orientativa.
 */
export function RecontratacionDetallePage({ numero }: { numero: string }) {
  const { fetchByNumero, error } = useRecontratacion()
  const [estado, setEstado] = useState<Estado>({ status: "loading" })

  useEffect(() => {
    let active = true
    // fetchByNumero ya convierte los errores en `error` y devuelve null.
    void fetchByNumero(numero).then(data => {
      if (active) setEstado(data ? { status: "ready", data } : { status: "missing" })
    })
    return () => { active = false }
  }, [fetchByNumero, numero])

  if (estado.status === "loading") return <DetalleSkeleton />

  if (estado.status === "missing") {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4">
        <p className="text-body-md text-foreground">{error ?? "No se encontró el registro."}</p>
        <Button asChild variant="outline" size="sm"><Link href="/recontratacion">Volver a recontratación</Link></Button>
      </div>
    )
  }

  const { data } = estado
  return (
    <div className="grid gap-6 dense:gap-4">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid min-w-0 gap-1">
          <p className="text-body-sm tabular-nums text-muted-foreground">Núm. {data.numero}</p>
          <h2 className="break-words text-heading-md text-foreground">{data.nombre}</h2>
          {data.puesto && <p className="text-body-md text-muted-foreground">{data.puesto}</p>}
        </div>
        <div className="flex items-center gap-3">
          <RecomendacionBadge data={data} />
          <Button asChild size="sm">
            <Link href={`/recontratacion/imprimir?numero=${encodeURIComponent(data.numero)}`} target="_blank">
              <Printer aria-hidden="true" />Imprimir formato
            </Link>
          </Button>
        </div>
      </header>

      <section aria-labelledby="reco-datos" className="grid gap-3">
        <h3 id="reco-datos" className={SECTION_TITLE}>Datos generales</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-border bg-card p-4 dense:gap-y-3 dense:p-3 sm:grid-cols-3">
          <Dato label="Departamento" value={data.departamento || "—"} />
          <Dato label="Turno" value={data.turno || "—"} />
          <Dato label="Jefe directo" value={data.jefeDirecto || "—"} />
          <Dato label="Fecha de ingreso" value={formatDate(data.fechaIngresoISO)} />
          <Dato label="Término de contrato" value={formatDate(data.terminoContratoISO)} />
          <Dato label="RG-REC-048" value={data.rgEntregado || "—"} />
        </dl>
      </section>

      <section aria-labelledby="reco-incidencias" className="grid gap-3">
        <h3 id="reco-incidencias" className={SECTION_TITLE}>Incidencias · primeros 90 días</h3>
        <div className={PANEL}>
          <Table className={cn("min-w-max", TABLE)}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Mes</TableHead>
                {INCIDENCIA_COLUMNS.map(column => (
                  <TableHead key={column.header} scope="col" className="text-center">{column.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.incidencias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={INCIDENCIA_COLUMNS.length + 1} className="text-center text-body-md text-muted-foreground">
                    Sin periodo registrado: falta la fecha de ingreso.
                  </TableCell>
                </TableRow>
              ) : data.incidencias.map(month => (
                <TableRow key={month.mes}>
                  <TableCell className="whitespace-nowrap text-label-sm">{formatMesLargo(month.mes)}</TableCell>
                  {INCIDENCIA_COLUMNS.map(column => {
                    const value = month.valores[column.categoria]
                    return (
                      <TableCell key={column.header} className={cn("text-center text-body-md tabular-nums",
                        column.categoria === "FALTA INJUSTIFICADA" && "text-destructive")}>
                        {value || <Vacio />}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section aria-labelledby="reco-evaluaciones" className="grid gap-3">
        <h3 id="reco-evaluaciones" className={SECTION_TITLE}>Evaluaciones de desempeño</h3>
        <div className={PANEL}>
          <Table className={TABLE}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className="w-10">#</TableHead>
                <TableHead scope="col">Periodo</TableHead>
                <TableHead scope="col" className="w-28 text-right">Calificación</TableHead>
                <TableHead scope="col">Plan de seguimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.evaluaciones.map((evaluacion, index) => (
                <TableRow key={index}>
                  <TableCell className="text-body-sm tabular-nums text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="whitespace-nowrap text-body-md">{evaluacion.periodo.label || <Vacio />}</TableCell>
                  <TableCell className={cn("text-right text-label-sm tabular-nums",
                    evaluacion.calificacion != null && evaluacion.calificacion < EVAL_THRESHOLDS.minPass && "text-destructive")}>
                    {evaluacion.calificacion ?? <Vacio />}
                  </TableCell>
                  <TableCell className="min-w-48 text-body-md text-muted-foreground">{evaluacion.planSeguimiento || <Vacio />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

    </div>
  )
}
