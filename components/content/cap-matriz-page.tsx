"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CursosRequeridos, HistorialCursos } from "@/components/content/cap-matriz-cursos"
import { PLANTILLA_PATH } from "@/components/content/plantilla-paths"
import { useCapacitacion } from "@/lib/hooks"
import { getLatestEmployeeCourseAttempts } from "@/lib/hooks/useCapacitacion"
import type { Employee, EmployeeCourse, EmployeeProgress } from "@/lib/hooks"
import { supabase } from "@/lib/supabase/client"
import { describeSupabaseError } from "@/lib/supabase/errors"

interface MatrizData {
  employee: Employee
  courses: EmployeeCourse[]
  progress: EmployeeProgress
}

type Estado =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "not-found" }
  | ({ status: "ready" } & MatrizData)

const CACHE_TTL_MS = 60_000
const matrizCache = new Map<string, { data: MatrizData; at: number }>()
let authResetRegistered = false

function ensureCacheAuthReset() {
  if (authResetRegistered || typeof window === "undefined") return
  authResetRegistered = true
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") matrizCache.clear()
  })
}

const SECTION_TITLE = "flex items-baseline gap-2 text-eyebrow uppercase text-muted-foreground"
const SKELETON_ROW_WIDTHS = ["w-52", "w-44", "w-60", "w-48", "w-56", "w-40"] as const

/** Avance del puesto en una línea: aprobados contra requeridos y su porcentaje. */
function Avance({ progress }: { progress: EmployeeProgress }) {
  const porcentaje = Math.round((progress.aprobados / progress.totalRequired) * 100)
  return (
    <p className="flex items-baseline gap-2 whitespace-nowrap text-body-sm tabular-nums text-muted-foreground">
      {progress.aprobados} de {progress.totalRequired} aprobados
      <span className="text-label-sm text-foreground">{porcentaje}%</span>
    </p>
  )
}

function SkeletonCourseList({ title, rows }: { title: string; rows: number }) {
  return (
    <div className="grid gap-3">
      <div className="flex items-baseline gap-2">
        <span className={SECTION_TITLE}>{title}</span>
        <Skeleton className="h-3.5 w-6" />
      </div>
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex min-h-(--control-height) items-center gap-3 px-4 py-2">
            <Skeleton className="size-4 shrink-0 rounded-sm" />
            <Skeleton className={`h-4 max-w-[65%] flex-1 ${SKELETON_ROW_WIDTHS[index % SKELETON_ROW_WIDTHS.length]}`} />
            <Skeleton className="hidden h-3.5 w-20 shrink-0 sm:block" />
            <Skeleton className="h-6 w-8 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

function MatrizSkeleton() {
  return (
    <div role="status" aria-label="Cargando matriz de capacitación" className="grid gap-6 dense:gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="grid gap-1.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-6 w-72 max-w-full" />
        </div>
        <Skeleton className="h-4 w-36" />
      </div>
      <div aria-hidden="true" className="grid items-start gap-6 dense:gap-4 lg:grid-cols-2">
        <SkeletonCourseList title="Requeridos" rows={6} />
        <SkeletonCourseList title="Historial" rows={6} />
      </div>
    </div>
  )
}

/**
 * Matriz de capacitación de un empleado: los cursos que pide su puesto y su
 * historial. En escritorio se ven lado a lado; en celular, uno debajo del otro.
 */
export function CapMatrizPage({ empleadoId }: { empleadoId: string }) {
  const cachedInitial = matrizCache.get(empleadoId)
  const [estado, setEstado] = useState<Estado>(() =>
    cachedInitial ? { status: "ready", ...cachedInitial.data } : { status: "loading" }
  )
  // Las funciones del hook se recrean en cada render: se leen del ref para cargar una sola vez.
  const capacitacion = useCapacitacion()
  const capacitacionRef = useRef(capacitacion)
  capacitacionRef.current = capacitacion
  const requestIdRef = useRef(0)

  const cargar = useCallback(async (force = false) => {
    const requestId = ++requestIdRef.current
    const cached = matrizCache.get(empleadoId)
    if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
      setEstado({ status: "ready", ...cached.data })
      return
    }
    if (!cached) setEstado({ status: "loading" })

    const { fetchEmployeeCourses, fetchEmployeeProgress } = capacitacionRef.current
    // Lanza empleado e historial en paralelo desde el primer instante.
    const historialPromise = fetchEmployeeCourses(empleadoId)
    const [employeeResult, rawCourses] = await Promise.all([
      supabase
        .from("employees")
        .select("id, numero, nombre, puesto, departamento, area, turno, fecha_ingreso, jefe_directo, evaluacion_desempeno")
        .eq("id", empleadoId)
        .maybeSingle(),
      historialPromise,
    ])
    if (requestId !== requestIdRef.current) return

    if (employeeResult.error) {
      throw new Error(describeSupabaseError(employeeResult.error, "No se pudo cargar el empleado"))
    }
    if (!employeeResult.data) {
      matrizCache.delete(empleadoId)
      setEstado({ status: "not-found" })
      return
    }

    const employee = employeeResult.data as Employee
    const progress = await fetchEmployeeProgress(employee, Promise.resolve(rawCourses))
    if (requestId !== requestIdRef.current) return

    const readyData: MatrizData = {
      employee,
      courses: getLatestEmployeeCourseAttempts(rawCourses),
      progress,
    }
    matrizCache.set(empleadoId, { data: readyData, at: Date.now() })
    setEstado({ status: "ready", ...readyData })
  }, [empleadoId])

  useEffect(() => {
    ensureCacheAuthReset()
    let active = true
    cargar(false).catch(cause => {
      if (active) {
        setEstado({
          status: "error",
          message: cause instanceof Error ? cause.message : "No se pudo cargar la matriz",
        })
      }
    })
    return () => {
      active = false
      requestIdRef.current += 1
    }
  }, [cargar])

  if (estado.status === "loading") return <MatrizSkeleton />

  if (estado.status !== "ready") {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-(--card-padding)">
        <p className="text-body-md text-foreground">
          {estado.status === "not-found" ? "No se encontró el empleado." : estado.message}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {estado.status === "error" && (
            <Button
              type="button"
              size="sm"
              className="touch-target"
              onClick={() => {
                void cargar(true).catch(cause => {
                  setEstado({
                    status: "error",
                    message: cause instanceof Error ? cause.message : "No se pudo cargar la matriz",
                  })
                })
              }}
            >
              Reintentar
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="touch-target"><Link href={PLANTILLA_PATH}>Volver a plantilla</Link></Button>
        </div>
      </div>
    )
  }

  const { employee, courses, progress } = estado
  return (
    <div className="grid gap-6 dense:gap-4">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid min-w-0 gap-1">
          {employee.numero && <p className="text-body-sm tabular-nums text-muted-foreground">Núm. {employee.numero}</p>}
          <h2 className="break-words text-heading-md text-foreground">{employee.nombre}</h2>
        </div>
        {progress.positionFound && progress.totalRequired > 0 && <Avance progress={progress} />}
      </header>

      <div className="grid items-start gap-6 dense:gap-4 lg:grid-cols-2">
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
