"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dato } from "@/components/content/recontratacion-ui"
import {
  folioExamen, formatFechaExamen, obtenerExamenHistorial, type ExamenHistorial,
} from "@/lib/hooks/useHistorialExamenes"
import type { PreguntaExamen } from "@/lib/hooks/useExamenes"
import { EXAMENES_HISTORIAL_HREF } from "@/components/content/examenes-tabs"
import { cn } from "@/lib/utils"

type Estado =
  | { status: "loading" }
  | { status: "missing"; message: string }
  | { status: "ready"; examen: ExamenHistorial }

const OPCIONES = ["a", "b", "c"] as const
const SECTION_TITLE = "text-eyebrow uppercase text-muted-foreground"

function HojaSkeleton() {
  return (
    <div role="status" aria-label="Cargando hoja de respuestas" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-72 max-w-full" />
      </div>
      <Skeleton aria-hidden="true" className="h-20 rounded-xl" />
      {[0, 1, 2].map(item => <Skeleton key={item} aria-hidden="true" className="h-32 rounded-xl" />)}
    </div>
  )
}

/** Una pregunta con sus tres opciones; la correcta se marca en verde con ✓. */
function Pregunta({ pregunta, numero }: { pregunta: PreguntaExamen; numero: number }) {
  return (
    <li className="grid gap-3 rounded-xl border border-border bg-card p-(--card-padding)">
      <p className="text-label-sm text-foreground">
        <span className="mr-1.5 tabular-nums text-muted-foreground">{numero}.</span>{pregunta.pregunta}
      </p>
      <ul className="grid gap-2" aria-label={`Opciones de la pregunta ${numero}`}>
        {OPCIONES.map(opcion => {
          const correcta = pregunta.respuesta_correcta === opcion
          return (
            <li key={opcion} className={cn("flex items-start gap-3 rounded-md border px-3 py-2 text-body-md",
              correcta ? "border-success/30 bg-success/10 text-foreground" : "border-border text-muted-foreground")}>
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-md border text-label-sm uppercase",
                correcta ? "border-success bg-success text-success-foreground" : "border-border")}>
                {opcion}
              </span>
              <span className="min-w-0 flex-1 pt-0.5">{pregunta[`opcion_${opcion}`]}</span>
              {correcta && (
                <span className="flex shrink-0 items-center gap-1 pt-0.5 text-body-sm font-medium text-success">
                  <Check className="size-4" aria-hidden="true" />Correcta
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </li>
  )
}

/** Hoja de respuestas de un examen generado: datos del examen y cada pregunta con su respuesta correcta. */
export function ExamenHojaRespuestasPage({ id }: { id: string }) {
  const [estado, setEstado] = useState<Estado>({ status: "loading" })

  useEffect(() => {
    let active = true
    obtenerExamenHistorial(id)
      .then(examen => {
        if (active) setEstado(examen ? { status: "ready", examen } : { status: "missing", message: "No se encontró el examen." })
      })
      .catch(() => {
        if (active) setEstado({ status: "missing", message: "No se pudo cargar el examen." })
      })
    return () => { active = false }
  }, [id])

  if (estado.status === "loading") return <HojaSkeleton />

  if (estado.status === "missing") {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4">
        <p className="text-body-md text-foreground">{estado.message}</p>
        <Button asChild variant="outline" size="sm"><Link href={EXAMENES_HISTORIAL_HREF}>Volver al historial</Link></Button>
      </div>
    )
  }

  const { examen } = estado
  return (
    <div className="grid gap-6 dense:gap-4">
      <header className="grid min-w-0 gap-1">
        <p className="text-body-sm tabular-nums text-muted-foreground">Folio {folioExamen(examen)}</p>
        <h2 className="break-words text-heading-md text-foreground">{examen.empleado?.nombre ?? "Empleado desconocido"}</h2>
        <p className="text-body-md text-muted-foreground">
          {examen.empleado?.numero ? `#${examen.empleado.numero} · ` : ""}{examen.departamento}
        </p>
      </header>

      <section aria-labelledby="hoja-datos" className="grid gap-3">
        <h3 id="hoja-datos" className={SECTION_TITLE}>Datos del examen</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-border bg-card p-4 dense:gap-y-3 dense:p-3 sm:grid-cols-4">
          <Dato label="Categoría actual" value={examen.categoria_actual || "—"} />
          <Dato label="Categoría destino" value={examen.categoria_destino || "—"} />
          <Dato label="Fecha" value={formatFechaExamen(examen.created_at)} />
          <Dato label="Preguntas" value={String(examen.preguntas.length)} />
        </dl>
      </section>

      <section aria-labelledby="hoja-preguntas" className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 id="hoja-preguntas" className={SECTION_TITLE}>Hoja de respuestas</h3>
          <Badge variant="success" size="sm" className="font-normal">
            <Check className="size-3" aria-hidden="true" />Respuesta correcta
          </Badge>
        </div>
        <ol className="grid gap-3 xl:grid-cols-2">
          {examen.preguntas.map((pregunta, index) => (
            <Pregunta key={pregunta.id} pregunta={pregunta} numero={index + 1} />
          ))}
        </ol>
      </section>
    </div>
  )
}
