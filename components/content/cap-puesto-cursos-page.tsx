"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Loader2, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCapacitacion, useRole } from "@/lib/hooks"
import type { Course, Position, PositionCourse } from "@/lib/hooks"
import { notify } from "@/lib/notify"
import { PLANTILLA_PATH } from "@/components/content/plantilla-paths"

type Estado =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "not-found" }
  | { status: "ready"; position: Position; positionCourses: PositionCourse[]; courses: Course[] }

const SECTION_TITLE = "flex items-baseline gap-2 text-eyebrow uppercase text-muted-foreground"

function PuestoSkeleton() {
  return (
    <div role="status" aria-label="Cargando cursos del puesto" className="grid gap-6 dense:gap-4">
      <div className="grid gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-72 max-w-full" />
      </div>
      <Skeleton aria-hidden="true" className="h-80 rounded-xl" />
    </div>
  )
}

/** Cursos requeridos de un puesto, en orden; quien edita puede asignar y quitar. */
export function CapPuestoCursosPage({ puestoId }: { puestoId: string }) {
  const { isReadOnly } = useRole()
  const [estado, setEstado] = useState<Estado>({ status: "loading" })
  const [assignCourseId, setAssignCourseId] = useState("")
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  // Las funciones del hook se recrean en cada render: se leen del ref.
  const capacitacion = useCapacitacion()
  const capacitacionRef = useRef(capacitacion)
  capacitacionRef.current = capacitacion

  useEffect(() => {
    let active = true
    const { fetchPositions, fetchPositionCourses, fetchCourses } = capacitacionRef.current
    Promise.all([fetchPositions(), fetchPositionCourses(puestoId), fetchCourses()])
      .then(([positions, positionCourses, courses]) => {
        if (!active) return
        const position = positions.find(item => item.id === puestoId)
        setEstado(position ? { status: "ready", position, positionCourses, courses } : { status: "not-found" })
      })
      .catch(cause => {
        if (active) setEstado({ status: "error", message: cause instanceof Error ? cause.message : "No se pudieron cargar los cursos del puesto" })
      })
    return () => { active = false }
  }, [puestoId])

  /** Vuelve a leer los cursos del puesto tras asignar o quitar. */
  const recargar = useCallback(async () => {
    const positionCourses = await capacitacionRef.current.fetchPositionCourses(puestoId)
    setEstado(current => current.status === "ready" ? { ...current, positionCourses } : current)
  }, [puestoId])

  if (estado.status === "loading") return <PuestoSkeleton />

  if (estado.status !== "ready") {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-(--card-padding)">
        <p className="text-body-md text-foreground">
          {estado.status === "not-found" ? "No se encontró el puesto." : estado.message}
        </p>
        <Button asChild variant="outline" size="sm" className="touch-target"><Link href={PLANTILLA_PATH}>Volver a plantilla</Link></Button>
      </div>
    )
  }

  const { position, positionCourses, courses } = estado
  const disponibles = courses.filter(course => !positionCourses.some(item => item.course_id === course.id))

  const asignar = async () => {
    if (!assignCourseId) return
    setSaving(true)
    const nextOrder = positionCourses.length > 0 ? Math.max(...positionCourses.map(item => item.order_index)) + 1 : 1
    const result = await capacitacionRef.current.addCourseToPosition(position.id, assignCourseId, nextOrder)
    if (result.success) {
      setAssignCourseId("")
      await recargar()
      notify.success("Curso asignado correctamente")
    } else {
      notify.error(result.error ?? "Error al asignar curso")
    }
    setSaving(false)
  }

  const quitar = async (item: PositionCourse) => {
    setRemovingId(item.id)
    const result = await capacitacionRef.current.removeCourseFromPosition(item.id)
    if (result.success) {
      await recargar()
      notify.success("Curso quitado")
    } else {
      notify.error(result.error ?? "Error al quitar curso")
    }
    setRemovingId(null)
  }

  return (
    <div className="grid gap-6 dense:gap-4">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid min-w-0 gap-1">
          {position.department?.name && <p className="text-body-sm text-muted-foreground">{position.department.name}</p>}
          <h2 className="break-words text-heading-md text-foreground">{position.name}</h2>
        </div>

        {/* Asignar: el curso nuevo se agrega al final del orden. */}
        {!isReadOnly && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Select value={assignCourseId} onValueChange={setAssignCourseId} disabled={disponibles.length === 0}>
              <SelectTrigger className="min-w-0 flex-1 sm:w-72 sm:flex-none" aria-label="Curso para asignar">
                <SelectValue placeholder={disponibles.length === 0 ? "Todos los cursos asignados" : "Selecciona un curso…"} />
              </SelectTrigger>
              <SelectContent matchTriggerWidth>
                {disponibles.map(course => (
                  <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" disabled={!assignCourseId || saving} aria-busy={saving || undefined} onClick={asignar}>
              {saving ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Plus aria-hidden="true" />}
              Asignar
            </Button>
          </div>
        )}
      </header>

      <section aria-labelledby="puesto-cursos" className="grid gap-3">
        <h3 id="puesto-cursos" className={SECTION_TITLE}>
          Cursos requeridos <span className="tabular-nums">{positionCourses.length}</span>
        </h3>
        {positionCourses.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-(--card-padding) py-12 text-center text-body-md text-muted-foreground">
            Este puesto todavía no tiene cursos requeridos.
          </p>
        ) : (
          <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {positionCourses.map(item => (
              <li key={item.id} className="flex min-h-(--control-height) min-w-0 items-center gap-3 px-4 py-2">
                <span className="w-6 shrink-0 text-right text-body-sm tabular-nums text-muted-foreground">{item.order_index}</span>
                <span className="min-w-0 flex-1 truncate text-label-sm text-foreground" title={item.course.name}>{item.course.name}</span>
                {item.course.tipo && <span className="hidden shrink-0 text-body-sm text-muted-foreground sm:inline">{item.course.tipo}</span>}
                {!isReadOnly && (
                  <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={removingId === item.id} aria-label={`Quitar ${item.course.name}`} onClick={() => quitar(item)}>
                    {removingId === item.id ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <X aria-hidden="true" />}
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
