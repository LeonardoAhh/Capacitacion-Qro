"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { JsonImportError, JsonPasteStep, JsonReviewHeader } from "@/components/content/plantilla/json-import-step"
import { matchCourse, type Course, type CourseAlias, type CourseMatch } from "@/lib/hooks/useCapacitacion"
import { guardarCursos, leerCursosJson, type CursosArchivo } from "@/lib/plantilla/cursos-import"
import { notify } from "@/lib/notify"
import { supabase } from "@/lib/supabase/client"
import { describeSupabaseError } from "@/lib/supabase/errors"
import { fetchAllRows } from "@/lib/supabase/fetchAll"

const NUEVO = "__nuevo__"
const MAX_NUMEROS_LISTADOS = 10
const EJEMPLO = JSON.stringify(
  [{ numero: "1582", curso: "Inducción", fecha: "09/04/2026", "calificación": "9.7" }],
  null,
  2,
)

interface Referencias {
  empleadoId: Map<string, string>
  catalogo: Course[]
  aliases: CourseAlias[]
}

/** Carga masiva de cursos desde JSON en dos pasos: pegado y revisión. */
export function CargarCursosPage() {
  const [texto, setTexto] = useState("")
  const [referencias, setReferencias] = useState<Referencias | null>(null)
  const [refError, setRefError] = useState<string | null>(null)
  const [archivo, setArchivo] = useState<CursosArchivo | null>(null)
  const [matches, setMatches] = useState<CourseMatch[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([
      fetchAllRows<{ id: string; numero: string | null }>("employees", "id, numero"),
      supabase.from("courses").select("*").order("name"),
      supabase.from("course_aliases").select("*, course:courses(name, tipo)"),
    ]).then(([empleados, courses, aliases]) => {
      if (!active) return
      if (courses.error || aliases.error) throw courses.error ?? aliases.error
      setReferencias({
        empleadoId: new Map(empleados.filter((e) => e.numero?.trim()).map((e) => [e.numero!.trim(), e.id])),
        catalogo: (courses.data ?? []) as Course[],
        aliases: (aliases.data ?? []) as unknown as CourseAlias[],
      })
    }).catch((caught) => {
      if (active) setRefError(describeSupabaseError(caught, "No se pudieron cargar la plantilla y el catálogo de cursos"))
    })
    return () => { active = false }
  }, [])

  const filasPorCurso = useMemo(() => {
    const conteo = new Map<string, number>()
    for (const fila of archivo?.filas ?? []) conteo.set(fila.curso, (conteo.get(fila.curso) ?? 0) + 1)
    return conteo
  }, [archivo])

  const desconocidos = useMemo(
    () => [...new Set((archivo?.filas ?? []).map((fila) => fila.numero))].filter((numero) => !referencias?.empleadoId.has(numero)),
    [archivo, referencias],
  )

  const porRevisar = matches.filter((match) => match.status === "approximate" || match.status === "unknown")
  const hasErrores = Boolean(archivo && (archivo.errores.length > 0 || desconocidos.length > 0))
  const listo = archivo !== null && !hasErrores && archivo.filas.length > 0

  const volverAlEditor = () => {
    setArchivo(null)
    setMatches([])
  }

  const reiniciar = () => {
    setTexto("")
    volverAlEditor()
  }

  const validar = () => {
    volverAlEditor()
    if (!referencias || !texto.trim()) return
    const leido = leerCursosJson(texto)
    const nombres = [...new Set(leido.filas.map((fila) => fila.curso))].sort((a, b) => a.localeCompare(b, "es-MX"))
    setArchivo(leido)
    setMatches(nombres.map((nombre) => matchCourse(nombre, referencias.catalogo, referencias.aliases)))
  }

  const resolver = (rawName: string, value: string) => {
    setMatches((current) => current.map((match) => match.rawName !== rawName ? match : value === NUEVO
      ? { ...match, createNew: true, resolvedCourseId: null }
      : { ...match, createNew: false, resolvedCourseId: value }))
  }

  const handleSave = async () => {
    if (!archivo || !referencias || !listo) return
    setSaving(true)
    try {
      const guardado = await guardarCursos(archivo.filas, referencias.empleadoId, matches)
      notify.success(`${guardado.insertados + guardado.actualizados} cursos cargados`, {
        description: `${guardado.insertados} nuevos y ${guardado.actualizados} actualizados`,
      })
      reiniciar()
    } catch (caught) {
      notify.error(describeSupabaseError(caught, "No se pudieron cargar los cursos"))
    } finally {
      setSaving(false)
    }
  }

  if (refError) {
    return (
      <div className="max-w-3xl">
        <JsonImportError title={refError} />
      </div>
    )
  }

  if (listo && archivo) {
    return (
      <div className="step-enter max-w-4xl space-y-4">
        <JsonReviewHeader
          disabled={saving}
          onBack={volverAlEditor}
          stats={[
            { label: "Registros", value: archivo.filas.length },
            { label: "Empleados", value: new Set(archivo.filas.map((fila) => fila.numero)).size },
            { label: "Cursos", value: matches.length },
            ...(archivo.repetidas > 0 ? [{ label: "Repetidas (se usa la última)", value: archivo.repetidas }] : []),
          ]}
        />

        {porRevisar.length > 0 ? (
          <Card className="p-(--card-padding)">
            <section aria-labelledby="cargar-cursos-revision" className="space-y-2">
              <h2 id="cargar-cursos-revision" className="text-label-sm text-foreground">
                {porRevisar.length === 1 ? "1 curso no está en el catálogo" : `${porRevisar.length} cursos no están en el catálogo`}
              </h2>
              <ul className="divide-y divide-border">
                {porRevisar.map((match) => (
                  <li key={match.rawName} className="grid items-center gap-x-4 gap-y-2 py-3 last:pb-0 sm:grid-cols-2">
                    <div className="min-w-0">
                      <p className="break-words text-body-md text-foreground">{match.rawName}</p>
                      <p className="text-body-sm tabular-nums text-muted-foreground">
                        {filasPorCurso.get(match.rawName) ?? 0} filas
                        {match.status === "approximate" && ` · parecido al ${Math.round(match.confidence * 100)}%`}
                      </p>
                    </div>
                    <Select
                      value={match.createNew ? NUEVO : match.resolvedCourseId ?? NUEVO}
                      onValueChange={(value) => resolver(match.rawName, value)}
                      disabled={saving}
                    >
                      <SelectTrigger aria-label={`Curso para ${match.rawName}`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NUEVO}>Crear curso nuevo</SelectItem>
                        {referencias?.catalogo.map((course) => (
                          <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </li>
                ))}
              </ul>
            </section>
          </Card>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-(--card-padding) text-body-md text-foreground">
            <CheckCircle2 className="size-4 shrink-0 text-chart-1-deep" aria-hidden="true" />
            Todos los cursos coinciden con el catálogo. Listo para cargar.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={reiniciar} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={() => void handleSave()} loading={saving}>
            {`Cargar ${archivo.filas.length} ${archivo.filas.length === 1 ? "registro" : "registros"}`}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <JsonPasteStep
      value={texto}
      placeholder={EJEMPLO}
      disabled={saving}
      loading={!referencias}
      hasError={hasErrores}
      onChange={(next) => {
        setTexto(next)
        volverAlEditor()
      }}
      onClear={reiniciar}
      onValidate={validar}
      errorSlot={
        archivo && archivo.errores.length > 0 ? (
          <JsonImportError title="Corrige los datos antes de cargarlos">
            <ul className="list-disc space-y-0.5 pl-4 text-body-sm">
              {archivo.errores.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </JsonImportError>
        ) : archivo && archivo.errores.length === 0 && desconocidos.length > 0 ? (
          <JsonImportError title={desconocidos.length === 1 ? "1 número no está en la plantilla" : `${desconocidos.length} números no están en la plantilla`}>
            <p className="text-body-sm tabular-nums">
              {desconocidos.slice(0, MAX_NUMEROS_LISTADOS).join(", ")}
              {desconocidos.length > MAX_NUMEROS_LISTADOS && ` y ${desconocidos.length - MAX_NUMEROS_LISTADOS} más`}
            </p>
          </JsonImportError>
        ) : undefined
      }
    />
  )
}
