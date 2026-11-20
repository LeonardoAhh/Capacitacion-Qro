"use client"

import { BadgeCheck, BookOpen, Clock3, OctagonX, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { isPassingCourseGrade } from "@/lib/capacitacion/utils"
import type { EmployeeCourse, EmployeeProgress } from "@/lib/hooks"
import { cn } from "@/lib/utils"

type Estado = "aprobado" | "reprobado" | "pendiente" | "registrado"

const ESTADO: Record<Estado, { icon: LucideIcon; color: string; label: string }> = {
  aprobado: { icon: BadgeCheck, color: "text-success", label: "Aprobado" },
  reprobado: { icon: OctagonX, color: "text-destructive", label: "Reprobado" },
  pendiente: { icon: Clock3, color: "text-muted-foreground", label: "Pendiente" },
  registrado: { icon: BookOpen, color: "text-muted-foreground", label: "Sin calificación" },
}

/** "2026-11-18" → "18/11/2026". */
function formatDate(value: string) {
  return value.split("-").reverse().join("/")
}

function CursoRow({ nombre, fecha, calificacion, estado }: {
  nombre: string
  fecha: string | null
  calificacion: number | null
  estado: Estado
}) {
  const { icon: Icon, color, label } = ESTADO[estado]
  return (
    <li className="flex min-h-14 items-center gap-3 px-4 py-2.5">
      <Icon className={cn("size-4 shrink-0", color)} aria-hidden="true" />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="break-words text-label-sm text-foreground">
          <span className="sr-only">{label}: </span>{nombre}
        </p>
        {fecha && <p className="text-body-sm tabular-nums text-muted-foreground">{formatDate(fecha)}</p>}
      </div>
      {calificacion != null && (
        <Badge variant={estado === "aprobado" ? "success" : "destructive"} size="sm" className="shrink-0 tabular-nums"
          aria-label={`Calificación ${calificacion}`}>
          {calificacion}
        </Badge>
      )}
    </li>
  )
}

const LIST = "divide-y divide-border rounded-xl border border-border bg-card"
const EMPTY = "rounded-xl border border-dashed border-border px-4 py-8 text-center text-body-sm text-muted-foreground"

/** Cursos que pide el puesto, en el orden del catálogo, con su estado actual. */
export function CursosRequeridos({ progress }: { progress: EmployeeProgress }) {
  if (!progress.positionFound) {
    return (
      <p role="status" className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-body-md text-foreground">
        El puesto no está en el catálogo. Importa primero el JSON de puestos.
      </p>
    )
  }
  if (!progress.courses.length) return <p className={EMPTY}>Este puesto no tiene cursos requeridos.</p>
  return (
    <ul className={LIST}>
      {progress.courses.map(course => (
        <CursoRow key={course.courseId} nombre={course.courseName} fecha={course.fechaAplicacion}
          calificacion={course.calificacion} estado={course.status} />
      ))}
    </ul>
  )
}

/** Último intento de cada curso registrado, incluidos los que no pide el puesto. */
export function HistorialCursos({ courses }: { courses: EmployeeCourse[] }) {
  if (!courses.length) return <p className={EMPTY}>No hay cursos registrados.</p>
  return (
    <ul className={LIST}>
      {courses.map(course => {
        const grade = course.calificacion
        const estado: Estado = grade == null ? "registrado" : isPassingCourseGrade(grade) ? "aprobado" : "reprobado"
        return (
          <CursoRow key={course.id} nombre={course.course?.name ?? course.raw_course_name}
            fecha={course.fecha_aplicacion} calificacion={grade} estado={estado} />
        )
      })}
    </ul>
  )
}
