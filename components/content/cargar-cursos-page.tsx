"use client"

import { useEffect, useId, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { PLANTILLA_PATH } from "@/components/content/plantilla-paths"
import { PanelStats } from "@/components/dashboard-panel"
import { matchCourse, type Course, type CourseAlias, type CourseMatch } from "@/lib/hooks/useCapacitacion"
import { useRole } from "@/lib/hooks/useRole"
import { guardarCursos, leerCursosJson, type CursosArchivo } from "@/lib/plantilla/cursos-import"
import { notify } from "@/lib/notify"
import { supabase } from "@/lib/supabase/client"
import { describeSupabaseError } from "@/lib/supabase/errors"
import { fetchAllRows } from "@/lib/supabase/fetchAll"

const NUEVO = "__nuevo__"
const MAX_NUMEROS_LISTADOS = 10
const EJEMPLO = JSON.stringify([{ numero: "1582", curso: "Inducción", fecha: "09/04/2026", "calificación": "9.7" }], null, 2)

interface Referencias {
  empleadoId: Map<string, string>
  catalogo: Course[]
  aliases: CourseAlias[]
}

function ErrorBox({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div role="alert" className="space-y-1 rounded-xl border border-destructive/30 bg-destructive/10 p-(--card-padding) text-body-sm text-destructive">
      <p className="flex items-center gap-2 text-label-sm">
        <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
        {title}
      </p>
      {children}
    </div>
  )
}

/** Carga masiva de cursos tomados desde un .json, con revisión de los nombres que no coinciden con el catálogo. */
export function CargarCursosPage() {
  const { canEdit } = useRole()
  const textoId = useId()
  const ayudaId = useId()
  const [texto, setTexto] = useState("")
  const [referencias, setReferencias] = useState<Referencias | null>(null)
  const [refError, setRefError] = useState<string | null>(null)
  const [archivo, setArchivo] = useState<CursosArchivo | null>(null)
  const [matches, setMatches] = useState<CourseMatch[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{ insertados: number; actualizados: number } | null>(null)

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
        empleadoId: new Map(empleados.filter(e => e.numero?.trim()).map(e => [e.numero!.trim(), e.id])),
        catalogo: (courses.data ?? []) as Course[],
        aliases: (aliases.data ?? []) as unknown as CourseAlias[],
      })
    }).catch(caught => {
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
    () => [...new Set((archivo?.filas ?? []).map(fila => fila.numero))].filter(numero => !referencias?.empleadoId.has(numero)),
    [archivo, referencias],
  )
  const porRevisar = matches.filter(match => match.status === "approximate" || match.status === "unknown")
  const listo = archivo !== null && archivo.errores.length === 0 && desconocidos.length === 0 && archivo.filas.length > 0 && !resultado

  const limpiar = () => {
    setArchivo(null)
    setMatches([])
    setError(null)
    setResultado(null)
  }

  const revisar = () => {
    limpiar()
    if (!referencias || !texto.trim()) return
    const leido = leerCursosJson(texto)
    const nombres = [...new Set(leido.filas.map(fila => fila.curso))].sort((a, b) => a.localeCompare(b, "es-MX"))
    setArchivo(leido)
    setMatches(nombres.map(nombre => matchCourse(nombre, referencias.catalogo, referencias.aliases)))
  }

  const resolver = (rawName: string, value: string) => {
    setMatches(current => current.map(match => match.rawName !== rawName ? match : value === NUEVO
      ? { ...match, createNew: true, resolvedCourseId: null }
      : { ...match, createNew: false, resolvedCourseId: value }))
  }

  const handleSave = async () => {
    if (!archivo || !referencias || !listo) return
    setSaving(true)
    setError(null)
    try {
      const guardado = await guardarCursos(archivo.filas, referencias.empleadoId, matches)
      setResultado(guardado)
      notify.success(`Se cargaron ${guardado.insertados + guardado.actualizados} cursos.`)
    } catch (caught) {
      setError(describeSupabaseError(caught, "No se pudieron cargar los cursos"))
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) {
    return <p className="text-body-md text-muted-foreground">Tu rol no puede cargar cursos.</p>
  }

  return (
    // Dos columnas desde laptop: datos a la izquierda, revisión y resultado a la derecha.
    <div className="grid items-start gap-8 dense:gap-6 lg:grid-cols-2">
      <section aria-label="Datos" className="space-y-2 lg:sticky lg:top-0">
        <Label htmlFor={textoId}>Datos de los cursos</Label>
        {referencias ? (
          <>
            <Textarea
              id={textoId}
              aria-describedby={ayudaId}
              spellCheck={false}
              placeholder={EJEMPLO}
              value={texto}
              disabled={saving}
              onChange={event => {
                setTexto(event.target.value)
                limpiar()
              }}
              // Alto fijo: el contenido largo hace scroll dentro del campo y no se puede redimensionar.
              className="h-64 resize-none overflow-y-auto text-body-sm tabular-nums"
            />
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" className="touch-target" onClick={revisar} disabled={saving || !texto.trim()}>
                Revisar
              </Button>
            </div>
          </>
        ) : refError ? (
          <ErrorBox title={refError} />
        ) : (
          <Skeleton className="h-64 w-full rounded-md" />
        )}
      </section>

      <div className="min-w-0 space-y-6 dense:space-y-4">
        {!archivo && !resultado && (
          <p className="rounded-xl border border-dashed px-(--card-padding) py-10 text-center text-body-md text-muted-foreground">
            Pega los datos y da clic en Revisar para ver el resumen antes de cargar.
          </p>
        )}

        {archivo && archivo.errores.length > 0 && (
          <ErrorBox title="Corrige los datos antes de cargarlos">
            <ul className="list-disc space-y-0.5 pl-6">
              {archivo.errores.map(item => <li key={item}>{item}</li>)}
            </ul>
          </ErrorBox>
        )}

        {archivo && archivo.errores.length === 0 && desconocidos.length > 0 && (
          <ErrorBox title={desconocidos.length === 1 ? "1 número no está en la plantilla" : `${desconocidos.length} números no están en la plantilla`}>
            <p className="tabular-nums">
              {desconocidos.slice(0, MAX_NUMEROS_LISTADOS).join(", ")}
              {desconocidos.length > MAX_NUMEROS_LISTADOS && ` y ${desconocidos.length - MAX_NUMEROS_LISTADOS} más`}
            </p>
          </ErrorBox>
        )}

        {listo && (
          <>
            <PanelStats items={[
              { label: "Registros", value: archivo.filas.length },
              { label: "Empleados", value: new Set(archivo.filas.map(fila => fila.numero)).size },
              { label: "Cursos", value: matches.length },
              ...(archivo.repetidas > 0 ? [{ label: "Repetidas (se usa la última)", value: archivo.repetidas }] : []),
            ]} />

            {porRevisar.length > 0 && (
              <Card className="p-(--card-padding)">
                <section aria-labelledby="cargar-cursos-revision" className="space-y-2">
                  <h2 id="cargar-cursos-revision" className="text-label-sm text-foreground">
                    {porRevisar.length === 1 ? "1 curso no está en el catálogo" : `${porRevisar.length} cursos no están en el catálogo`}
                  </h2>
                  <ul className="divide-y">
                    {porRevisar.map(match => (
                      <li key={match.rawName} className="grid items-center gap-x-4 gap-y-2 py-3 last:pb-0 sm:grid-cols-2">
                        <div className="min-w-0">
                          <p className="break-words text-body-md text-foreground">{match.rawName}</p>
                          <p className="text-body-sm tabular-nums text-muted-foreground">
                            {filasPorCurso.get(match.rawName) ?? 0} filas
                            {match.status === "approximate" && ` · parecido al ${Math.round(match.confidence * 100)}%`}
                          </p>
                        </div>
                        <Select value={match.createNew ? NUEVO : match.resolvedCourseId ?? NUEVO} onValueChange={value => resolver(match.rawName, value)} disabled={saving}>
                          <SelectTrigger aria-label={`Curso para ${match.rawName}`} className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NUEVO}>Crear curso nuevo</SelectItem>
                            {referencias?.catalogo.map(course => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </li>
                    ))}
                  </ul>
                </section>
              </Card>
            )}

            {error && <ErrorBox title={error} />}

            <div className="flex justify-end gap-2">
              <Button asChild variant="outline" size="sm" className="touch-target">
                <Link href={PLANTILLA_PATH}>Cancelar</Link>
              </Button>
              <Button type="button" size="sm" className="touch-target" onClick={() => void handleSave()} disabled={saving} aria-busy={saving || undefined}>
                {saving ? "Cargando…" : `Cargar ${archivo.filas.length} registros`}
              </Button>
            </div>
          </>
        )}

        {resultado && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-(--card-padding)">
            <p className="flex items-center gap-2 text-body-md text-foreground">
              <CheckCircle2 className="size-4 shrink-0 text-chart-1-deep" aria-hidden="true" />
              {resultado.insertados} cursos nuevos y {resultado.actualizados} actualizados.
            </p>
            <Button asChild size="sm" className="touch-target">
              <Link href={PLANTILLA_PATH}>Volver a plantilla</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
