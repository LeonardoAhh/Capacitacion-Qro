"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { PlanAnualCapturaBarra } from "@/components/content/plan-anual-captura-barra"
import { useRole } from "@/lib/hooks"
import { notify } from "@/lib/notify"
import { cargarCursosFijos, cargarPlan, MESES, type CursoFijo, type CursoPlan, type TipoCurso } from "@/lib/plan-anual"
import { cargarPropuestasDnc, importarAlPlan, type PropuestaDnc } from "@/lib/plan-anual-dnc"
import { rutaPlan } from "@/lib/plan-anual-rutas"
import { registerUnsavedChangesGuard } from "@/lib/unsaved-changes"
import { cn } from "@/lib/utils"

type Fila = Pick<PropuestaDnc, "mes" | "tipo" | "area_solicitante" | "aplica_para"> & { incluir: boolean }
interface Datos {
  plan: { meses: number[]; cursos: CursoPlan[] }
  fijos: CursoFijo[]
  propuestas: PropuestaDnc[]
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`
// Una fila por curso: apilada en móvil, dos columnas en tablet y una sola línea desde lg.
const COLUMNAS = "lg:grid-cols-[minmax(0,2fr)_9rem_8rem_minmax(0,1fr)_minmax(0,1fr)]"
const ETIQUETA = "lg:sr-only"

/**
 * Revisión de los cursos autorizados en las DNC de un año antes de llevarlos al plan:
 * cada uno se ajusta o se descarta; los que ya están en el plan no se repiten.
 */
export function PlanAnualImportarDncPage({ anio }: { anio: number }) {
  const router = useRouter()
  const { canEdit, loading: roleLoading } = useRole()
  const [datos, setDatos] = useState<Datos | null>(null)
  const [filas, setFilas] = useState<Record<string, Fila>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Refleja las DNC y el plan tal como están al abrir la página.
  useEffect(() => {
    let active = true
    Promise.all([cargarPlan(anio), cargarCursosFijos()]).then(async ([plan, fijos]) => {
      const propuestas = await cargarPropuestasDnc(anio, plan.cursos)
      if (!active) return
      setDatos({ plan, fijos, propuestas })
      setFilas(Object.fromEntries(propuestas.map(propuesta => [propuesta.course_id, {
        incluir: !propuesta.enPlan,
        mes: propuesta.mes,
        tipo: propuesta.tipo,
        area_solicitante: propuesta.area_solicitante,
        aplica_para: propuesta.aplica_para,
      }])))
    }).catch(cause => {
      if (active) setLoadError(cause instanceof Error ? cause.message : "No se pudieron cargar las DNC.")
    })
    return () => { active = false }
  }, [anio])

  const confirmDiscard = useCallback(() => notify.confirm({
    title: "Descartar cambios",
    description: "Los ajustes en la importación de DNC no se han guardado.",
    confirmLabel: "Descartar",
    tone: "warning",
    size: "xs",
  }), [])

  useEffect(() => {
    if (!dirty) return
    return registerUnsavedChangesGuard(confirmDiscard)
  }, [confirmDiscard, dirty])

  const disponibles = (datos?.propuestas ?? []).filter(propuesta => !propuesta.enPlan)
  const seleccionadas = disponibles.filter(propuesta => filas[propuesta.course_id]?.incluir)
  const todas = disponibles.length > 0 && seleccionadas.length === disponibles.length

  function actualizar(courseId: string, cambios: Partial<Fila>) {
    setFilas(current => ({ ...current, [courseId]: { ...current[courseId], ...cambios } }))
    setDirty(true)
    setError(null)
  }

  function marcarTodas(incluir: boolean) {
    setFilas(current => Object.fromEntries(Object.entries(current).map(([courseId, fila]) => [courseId, { ...fila, incluir }])))
    setDirty(true)
    setError(null)
  }

  async function importar() {
    if (!datos) return
    if (seleccionadas.some(propuesta => !filas[propuesta.course_id].area_solicitante.trim() || !filas[propuesta.course_id].aplica_para.trim())) {
      setError("Completa el área que solicita y para quién aplica en cada curso seleccionado.")
      return
    }
    const items = seleccionadas.map(propuesta => {
      const fila = filas[propuesta.course_id]
      return {
        mes: fila.mes,
        datos: { course_id: propuesta.course_id, nombre: propuesta.nombre, area_solicitante: fila.area_solicitante, aplica_para: fila.aplica_para, tipo: fila.tipo },
      }
    })
    setSaving(true)
    setError(null)
    try {
      const agregados = await importarAlPlan(anio, items, datos.plan, datos.fijos)
      setDirty(false)
      notify.success(agregados === 1 ? "1 curso agregado al plan" : `${agregados} cursos agregados al plan`)
      router.push(rutaPlan(anio, Math.min(...items.map(item => item.mes))))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron agregar los cursos.")
      setSaving(false)
    }
  }

  if (!roleLoading && !canEdit) {
    return <p className="text-body-md text-muted-foreground">Solo quien edita el plan puede importar cursos de la DNC.</p>
  }

  return (
    <div className="grid gap-4">
      <PlanAnualCapturaBarra volverHref={rutaPlan(anio)} onConfirm={() => void importar()} saving={saving}
        confirmDisabled={seleccionadas.length === 0}
        confirmLabel={seleccionadas.length ? `Agregar ${plural(seleccionadas.length, "curso", "cursos")}` : "Agregar cursos"}
        descripcion={`Cursos autorizados en las DNC ${anio}. Ajusta cada uno antes de agregarlo; las DNC no se modifican.`} />
      {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}

      {loadError ? <p role="alert" className="text-body-md text-destructive">{loadError}</p>
        : !datos ? (
          <div role="status" aria-label="Cargando cursos de las DNC" className="grid gap-2">
            {[0, 1, 2].map(row => <Skeleton key={row} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : datos.propuestas.length === 0 ? (
          <p className="rounded-xl border border-dashed px-(--card-padding) py-10 text-center text-body-md text-muted-foreground">
            No hay cursos autorizados en las DNC de {anio}.
          </p>
        ) : (
          <section aria-label="Cursos autorizados en las DNC" className="overflow-hidden rounded-xl border bg-card">
            <div className={cn("flex items-center gap-3 border-b bg-muted/50 px-(--card-padding) py-2 lg:grid", COLUMNAS)}>
              <label className={cn("flex items-center gap-3 text-eyebrow uppercase text-muted-foreground", disponibles.length ? "cursor-pointer" : "cursor-default")}>
                <Checkbox checked={todas ? true : seleccionadas.length ? "indeterminate" : false} disabled={disponibles.length === 0}
                  onCheckedChange={checked => marcarTodas(checked === true)} aria-label="Seleccionar todos los cursos" />
                Curso <span className="normal-case tracking-normal">· {plural(seleccionadas.length, "seleccionado", "seleccionados")}</span>
              </label>
              {/* Encabezados de las demás columnas solo cuando la fila va en una línea. */}
              {["Mes", "Tipo", "Área que solicita", "Aplica para"].map(titulo => (
                <span key={titulo} aria-hidden="true" className="hidden text-eyebrow uppercase text-muted-foreground lg:block">{titulo}</span>
              ))}
            </div>
            <ul className="divide-y">
              {datos.propuestas.map(propuesta => (
                <PropuestaFila key={propuesta.course_id} propuesta={propuesta} fila={filas[propuesta.course_id]}
                  onChange={cambios => actualizar(propuesta.course_id, cambios)} />
              ))}
            </ul>
          </section>
        )}
    </div>
  )
}

function PropuestaFila({ propuesta, fila, onChange }: {
  propuesta: PropuestaDnc
  fila: Fila
  onChange: (cambios: Partial<Fila>) => void
}) {
  const id = `plan-dnc-${propuesta.course_id}`
  const enPlan = propuesta.enPlan
  // Los campos siguen visibles al descartar un curso (se leen todos igual), pero no se editan.
  const editable = !enPlan && fila.incluir

  return (
    <li className={cn("grid gap-3 px-(--card-padding) py-3 sm:grid-cols-2 lg:items-center lg:py-2", COLUMNAS, !editable && "bg-muted/30")}>
      <label className={cn("flex min-h-(--control-height) min-w-0 items-center gap-3 sm:col-span-2 lg:col-span-1 lg:min-h-0", enPlan ? "cursor-default" : "cursor-pointer")}>
        <Checkbox checked={editable} disabled={Boolean(enPlan)} onCheckedChange={checked => onChange({ incluir: checked === true })}
          aria-describedby={enPlan ? `${id}-en-plan` : undefined} />
        <span className="min-w-0">
          <span className={cn("block break-words text-label-sm", editable ? "text-foreground" : "text-muted-foreground")}>{propuesta.nombre}</span>
          {enPlan && <span id={`${id}-en-plan`} className="block text-body-sm text-muted-foreground lg:hidden">Ya en el plan · {MESES[enPlan.mes - 1]}</span>}
        </span>
      </label>

      {enPlan ? (
        <p aria-hidden="true" className="hidden text-body-sm text-muted-foreground lg:col-span-4 lg:block">Ya en el plan · {MESES[enPlan.mes - 1]}</p>
      ) : (
        <>
          <div className="grid min-w-0 gap-1.5">
            <Label htmlFor={`${id}-mes`} className={ETIQUETA}>Mes</Label>
            <Select value={String(fila.mes)} disabled={!editable} onValueChange={value => onChange({ mes: Number(value) })}>
              <SelectTrigger id={`${id}-mes`}><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {MESES.map((mes, index) => <SelectItem key={mes} value={String(index + 1)}>{mes}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid min-w-0 gap-1.5">
            <Label htmlFor={`${id}-tipo`} className={ETIQUETA}>Tipo</Label>
            <Select value={fila.tipo} disabled={!editable} onValueChange={value => onChange({ tipo: value as TipoCurso })}>
              <SelectTrigger id={`${id}-tipo`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="interno">Interno</SelectItem>
                <SelectItem value="externo">Externo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid min-w-0 gap-1.5">
            <Label htmlFor={`${id}-area`} className={ETIQUETA}>Área que solicita</Label>
            <Input id={`${id}-area`} value={fila.area_solicitante} disabled={!editable} maxLength={150}
              onChange={event => onChange({ area_solicitante: event.target.value })} />
          </div>
          <div className="grid min-w-0 gap-1.5">
            <Label htmlFor={`${id}-aplica`} className={ETIQUETA}>Aplica para</Label>
            <Input id={`${id}-aplica`} value={fila.aplica_para} disabled={!editable} maxLength={150}
              onChange={event => onChange({ aplica_para: event.target.value })} />
          </div>
        </>
      )}
    </li>
  )
}
