"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CursosRequeridos, HistorialCursos } from "@/components/content/cap-matriz-cursos"
import { useCapacitacion } from "@/lib/hooks"
import { getLatestEmployeeCourseAttempts } from "@/lib/hooks/useCapacitacion"
import type { Employee, EmployeeCourse, EmployeeProgress } from "@/lib/hooks"
import { supabase } from "@/lib/supabase/client"
import { describeSupabaseError } from "@/lib/supabase/errors"

type Estado =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "not-found" }
  | { status: "ready"; employee: Employee; courses: EmployeeCourse[]; progress: EmployeeProgress }

const SECTION_TITLE = "flex items-baseline gap-2 text-eyebrow uppercase text-muted-foreground"

/** Avance del puesto en una línea: aprobados contra requeridos y su porcentaje. */
function Avance({ progress }: { progress: EmployeeProgress }) {
  const porcentaje = Math.round((progress.aprobados / progress.totalRequired) * 100)
  return (
    <p className="flex items-baseline gap-2 whitespace-nowrap text-body-sm text-muted-foreground">
      {progress.aprobados} de {progress.totalRequired} aprobados
      <span className="tabular-nums text-label-sm text-foreground">{porcentaje}%</span>
    </p>
  )
}

function MatrizSkeleton() {
  return (
    <div role="status" aria-label="Cargando matriz" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-72 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map(item => <Skeleton key={item} aria-hidden="true" className="h-64 rounded-xl" />)}
      </div>
    </div>
  )
}

/**
 * Matriz de capacitación de un empleado: los cursos que pide su puesto y su
 * historial. En escritorio se ven lado a lado; en celular, uno debajo del otro.
 */
export function CapMatrizPage({ empleadoId }: { empleadoId: string }) {
  const [estado, setEstado] = useState<Estado>({ status: "loading" })
  // Las funciones del hook se recrean en cada render: se leen del ref para cargar una sola vez.
  const capacitacion = useCapacitacion()
  const capacitacionRef = useRef(capacitacion)
  capacitacionRef.current = capacitacion

  useEffect(() => {
    let active = true
    async function cargar() {
      const { data, error } = await supabase.from("employees").select("*").eq("id", empleadoId).maybeSingle()
      if (error) throw new Error(describeSupabaseError(error, "No se pudo cargar el empleado"))
      if (!data) {
        if (active) setEstado({ status: "not-found" })
        return
      }
      const employee = data as Employee
      const { fetchEmployeeCourses, fetchEmployeeProgress } = capacitacionRef.current
      const historial = fetchEmployeeCourses(employee.id)
      const [courses, progress] = await Promise.all([historial, fetchEmployeeProgress(employee, historial)])
      if (active) setEstado({ status: "ready", employee, courses: getLatestEmployeeCourseAttempts(courses), progress })
    }
    cargar().catch(cause => {
      if (active) setEstado({ status: "error", message: cause instanceof Error ? cause.message : "No se pudo cargar la matriz" })
    })
    return () => { active = false }
  }, [empleadoId])

  if (estado.status === "loading") return <MatrizSkeleton />

  if (estado.status !== "ready") {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4">
        <p className="text-body-md text-foreground">
          {estado.status === "not-found" ? "No se encontró el empleado." : estado.message}
        </p>
        <Button asChild variant="outline" size="sm"><Link href="/plantilla">Volver a plantilla</Link></Button>
      </div>
    )
  }

  const { employee, courses, progress } = estado
  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid min-w-0 gap-1">
          {employee.numero && <p className="text-body-sm tabular-nums text-muted-foreground">Núm. {employee.numero}</p>}
          <h2 className="break-words text-heading-md text-foreground">{employee.nombre}</h2>
        </div>
        {progress.positionFound && progress.totalRequired > 0 && <Avance progress={progress} />}
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section aria-labelledby="matriz-requeridos" className="grid gap-3">
          <h3 id="matriz-requeridos" className={SECTION_TITLE}>
            Requeridos <span className="tabular-nums">{progress.totalRequired}</span>
          </h3>
          <CursosRequeridos progress={progress} />
        </section>
        <section aria-labelledby="matriz-historial" className="grid gap-3">
          <h3 id="matriz-historial" className={SECTION_TITLE}>
            Historial <span className="tabular-nums">{courses.length}</span>
          </h3>
          <HistorialCursos courses={courses} />
        </section>
      </div>
    </div>
  )
}
