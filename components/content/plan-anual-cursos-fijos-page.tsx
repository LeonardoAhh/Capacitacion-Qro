"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { PlanAnualCapturaBarra } from "@/components/content/plan-anual-captura-barra"
import { useRole } from "@/lib/hooks"
import { useCatalogoCursos } from "@/lib/hooks/useCatalogoCursos"
import { notify } from "@/lib/notify"
import { cargarCursosFijos, guardarFijosEnPlan, type CursoFijo, type TipoCurso } from "@/lib/plan-anual"
import { rutaPlan } from "@/lib/plan-anual-rutas"
import { registerUnsavedChangesGuard } from "@/lib/unsaved-changes"
import { describeSupabaseError } from "@/lib/supabase/errors"

type Fila = Omit<CursoFijo, "orden"> & { key: number }

const TEXTO_MAX = 150
// Una fila por curso: apilada en móvil, dos columnas en tablet y una sola línea desde lg.
const COLUMNAS = "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_8rem_2.75rem]"
const ETIQUETA = "lg:sr-only"

/**
 * Cursos fijos del plan: se programan todos los meses y se listan primero. Al guardar,
 * los que falten se agregan a los meses ya iniciados del año.
 */
export function PlanAnualCursosFijosPage({ anio }: { anio: number }) {
  const router = useRouter()
  const { canEdit, loading: roleLoading } = useRole()
  const catalogo = useCatalogoCursos()
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [nextKey, setNextKey] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const volver = rutaPlan(anio)

  useEffect(() => {
    catalogo.cargar()
    let active = true
    cargarCursosFijos().then(lista => {
      if (!active) return
      setFilas(lista.map((fijo, key) => ({ ...fijo, key })))
      setNextKey(lista.length)
    }).catch(cause => {
      if (active) setLoadError(describeSupabaseError(cause, "No se pudieron cargar los cursos fijos"))
    })
    return () => { active = false }
  }, [catalogo.cargar])

  const confirmDiscard = useCallback(() => notify.confirm({
    title: "Descartar cambios",
    description: "Los cambios en los cursos fijos no se han guardado.",
    confirmLabel: "Descartar",
    tone: "warning",
    size: "xs",
  }), [])

  // La guardia cubre Cancelar, el título del header y la barra lateral.
  useEffect(() => {
    if (!dirty) return
    return registerUnsavedChangesGuard(confirmDiscard)
  }, [confirmDiscard, dirty])

  function cambiarFilas(update: (current: Fila[]) => Fila[]) {
    setFilas(current => update(current ?? []))
    setDirty(true)
    setError(null)
  }

  const actualizar = (key: number, cambios: Partial<Fila>) =>
    cambiarFilas(current => current.map(fila => fila.key === key ? { ...fila, ...cambios } : fila))

  function agregar() {
    const anterior = filas?.at(-1)
    // La fila nueva repite área, destinatarios y tipo de la anterior: suelen ser los mismos.
    cambiarFilas(current => [...current, {
      key: nextKey, course_id: "",
      area_solicitante: anterior?.area_solicitante ?? "", aplica_para: anterior?.aplica_para ?? "", tipo: anterior?.tipo ?? "interno",
    }])
    setNextKey(key => key + 1)
    requestAnimationFrame(() => document.getElementById(`plan-fijo-${nextKey}-curso`)?.focus())
  }

  async function guardar() {
    if (!filas) return
    if (filas.some(fila => !fila.course_id || !fila.area_solicitante.trim() || !fila.aplica_para.trim())) {
      setError("Selecciona el curso y completa área que solicita y aplica para en cada fila.")
      return
    }
    if (new Set(filas.map(fila => fila.course_id)).size !== filas.length) {
      setError("Hay un curso repetido en la lista.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const agregados = await guardarFijosEnPlan(anio, filas.map(({ course_id, area_solicitante, aplica_para, tipo }) => ({ course_id, area_solicitante, aplica_para, tipo })))
      setDirty(false)
      notify.success("Cursos fijos guardados", agregados ? { description: `${agregados} agregados al plan` } : undefined)
      router.push(volver)
    } catch (cause) {
      setError(describeSupabaseError(cause, "No se pudieron guardar los cursos fijos"))
      setSaving(false)
    }
  }

  if (!roleLoading && !canEdit) {
    return <p className="text-body-md text-muted-foreground">Solo quien edita el plan puede cambiar los cursos fijos.</p>
  }

  const cargando = !filas || catalogo.loading
  const errorCarga = loadError ?? catalogo.error

  return (
    <div className="grid gap-4">
      <PlanAnualCapturaBarra volverHref={volver} onConfirm={() => void guardar()} saving={saving}
        confirmDisabled={cargando || Boolean(errorCarga)} confirmLabel="Guardar cursos fijos"
        acciones={<Button type="button" variant="outline" size="sm" onClick={agregar} disabled={cargando || Boolean(errorCarga)}><Plus aria-hidden="true" />Agregar curso</Button>}
        descripcion={`Se programan todos los meses y se listan primero. Al guardar, los que falten se agregan a los meses ya iniciados de ${anio}.`} />
      {/* Junto a la acción que lo provocó. */}
      {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}

      {errorCarga ? <p role="alert" className="text-body-md text-destructive">{errorCarga}</p>
        : cargando ? (
          <div role="status" aria-label="Cargando cursos fijos" className="grid gap-2">
            {[0, 1, 2].map(row => <Skeleton key={row} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : (
          <section aria-label="Cursos fijos" className="overflow-hidden rounded-xl border bg-card">
            {/* Encabezados de columna solo cuando la fila va en una línea; antes, cada campo lleva su etiqueta. */}
            <div aria-hidden="true" className={`hidden gap-3 border-b bg-muted/50 px-(--card-padding) py-2 text-eyebrow uppercase text-muted-foreground lg:grid ${COLUMNAS}`}>
              <span>Curso</span><span>Área que solicita</span><span>Aplica para</span><span>Tipo</span><span />
            </div>
            {filas.length === 0 ? (
              <p className="px-(--card-padding) py-10 text-center text-body-md text-muted-foreground">Aún no hay cursos fijos.</p>
            ) : (
              <ol className="divide-y">
                {filas.map((fila, index) => {
                  const id = `plan-fijo-${fila.key}`
                  const usados = new Set(filas.filter(otra => otra.key !== fila.key).map(otra => otra.course_id))
                  return (
                    <li key={fila.key} className={`grid gap-3 px-(--card-padding) py-3 sm:grid-cols-2 lg:items-center lg:py-2 ${COLUMNAS}`}>
                      <div className="grid min-w-0 gap-1.5 sm:col-span-2 lg:col-span-1">
                        <Label htmlFor={`${id}-curso`} className={ETIQUETA}>Curso {index + 1}</Label>
                        <Select value={fila.course_id} onValueChange={value => actualizar(fila.key, { course_id: value })}>
                          <SelectTrigger id={`${id}-curso`}><SelectValue placeholder="Selecciona un curso" /></SelectTrigger>
                          <SelectContent matchTriggerWidth className="max-h-60">
                            {catalogo.cursos.filter(curso => !usados.has(curso.id)).map(curso => <SelectItem key={curso.id} value={curso.id}>{curso.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid min-w-0 gap-1.5">
                        <Label htmlFor={`${id}-area`} className={ETIQUETA}>Área que solicita</Label>
                        <Input id={`${id}-area`} value={fila.area_solicitante} maxLength={TEXTO_MAX} onChange={event => actualizar(fila.key, { area_solicitante: event.target.value })} />
                      </div>
                      <div className="grid min-w-0 gap-1.5">
                        <Label htmlFor={`${id}-aplica`} className={ETIQUETA}>Aplica para</Label>
                        <Input id={`${id}-aplica`} value={fila.aplica_para} maxLength={TEXTO_MAX} onChange={event => actualizar(fila.key, { aplica_para: event.target.value })} />
                      </div>
                      <div className="flex min-w-0 items-end gap-2 sm:col-span-2 lg:contents">
                        <div className="grid min-w-0 flex-1 gap-1.5">
                          <Label htmlFor={`${id}-tipo`} className={ETIQUETA}>Tipo</Label>
                          <Select value={fila.tipo} onValueChange={value => actualizar(fila.key, { tipo: value as TipoCurso })}>
                            <SelectTrigger id={`${id}-tipo`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="interno">Interno</SelectItem>
                              <SelectItem value="externo">Externo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive"
                          aria-label={`Quitar curso fijo ${index + 1}`} onClick={() => cambiarFilas(current => current.filter(otra => otra.key !== fila.key))}>
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        )}

      <p className="text-body-sm text-muted-foreground">Quitar un curso de la lista no lo borra de los meses donde ya está.</p>
    </div>
  )
}
