"use client"

import { useEffect, useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { MESES, type CursoPlan, type TipoCurso } from "@/lib/plan-anual"
import { cargarPropuestasDnc, type CursoImportado, type PropuestaDnc } from "@/lib/plan-anual-dnc"
import { cn } from "@/lib/utils"

interface PlanAnualDncDialogProps {
  anio: number
  cursosPlan: CursoPlan[]
  onClose: () => void
  onImport: (cursos: CursoImportado[]) => Promise<void>
}

type Fila = Pick<PropuestaDnc, "mes" | "tipo" | "area_solicitante" | "aplica_para"> & { incluir: boolean }

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/**
 * Revisión de los cursos autorizados en las DNC antes de llevarlos al plan: cada
 * uno se puede ajustar o descartar; los que ya están en el plan no se repiten.
 */
export function PlanAnualDncDialog({ anio, cursosPlan, onClose, onImport }: PlanAnualDncDialogProps) {
  const [propuestas, setPropuestas] = useState<PropuestaDnc[] | null>(null)
  const [filas, setFilas] = useState<Record<string, Fila>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Se lee al abrir: refleja las DNC y el plan tal como están en ese momento.
  useEffect(() => {
    let active = true
    cargarPropuestasDnc(anio, cursosPlan).then(data => {
      if (!active) return
      setPropuestas(data)
      setFilas(Object.fromEntries(data.map(propuesta => [propuesta.course_id, {
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
    // Una lectura por apertura; el plan visible no cambia mientras el modal está abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio])

  const seleccionadas = (propuestas ?? []).filter(propuesta => !propuesta.enPlan && filas[propuesta.course_id]?.incluir)

  function actualizar(courseId: string, cambios: Partial<Fila>) {
    setFilas(current => ({ ...current, [courseId]: { ...current[courseId], ...cambios } }))
    setError(null)
  }

  async function handleImport() {
    const incompletas = seleccionadas.filter(propuesta => {
      const fila = filas[propuesta.course_id]
      return !fila.area_solicitante.trim() || !fila.aplica_para.trim()
    })
    if (incompletas.length) {
      setError("Completa el área que solicita y para quién aplica en cada curso seleccionado.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onImport(seleccionadas.map(propuesta => {
        const fila = filas[propuesta.course_id]
        return {
          mes: fila.mes,
          datos: { course_id: propuesta.course_id, nombre: propuesta.nombre, area_solicitante: fila.area_solicitante, aplica_para: fila.aplica_para, tipo: fila.tipo },
        }
      }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron agregar los cursos.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveShell open onClose={onClose} size="xl" title="Traer desde la DNC">
      <ModalHeader title="Traer desde la DNC" subtitle={`Cursos autorizados en las DNC ${anio}`} onClose={onClose} />
      <div className="grid min-h-0 gap-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
        {loadError ? <p role="alert" className="text-body-md text-destructive">{loadError}</p>
          : !propuestas ? (
            <div role="status" aria-label="Cargando cursos de las DNC" className="grid gap-3">
              {[0, 1, 2].map(row => <Skeleton key={row} className="h-28 w-full rounded-xl" />)}
            </div>
          ) : propuestas.length === 0 ? (
            <p className="rounded-xl border border-dashed px-(--card-padding) py-10 text-center text-body-md text-muted-foreground">
              No hay cursos autorizados en las DNC de {anio}.
            </p>
          ) : (
            <>
              <p className="text-body-sm text-muted-foreground">
                Revisa y ajusta cada curso antes de agregarlo. Las DNC no se modifican.
              </p>
              <ul className="grid gap-3">
                {propuestas.map(propuesta => (
                  <PropuestaFila key={propuesta.course_id} propuesta={propuesta} fila={filas[propuesta.course_id]}
                    onChange={cambios => actualizar(propuesta.course_id, cambios)} />
                ))}
              </ul>
            </>
          )}
        {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}
      </div>
      <ModalFooter onCancel={onClose} onConfirm={handleImport} saving={saving}
        confirmDisabled={seleccionadas.length === 0}
        confirmLabel={seleccionadas.length ? `Agregar ${plural(seleccionadas.length, "curso", "cursos")}` : "Agregar cursos"} />
    </ResponsiveShell>
  )
}

function PropuestaFila({ propuesta, fila, onChange }: {
  propuesta: PropuestaDnc
  fila: Fila
  onChange: (cambios: Partial<Fila>) => void
}) {
  const id = `plan-dnc-${propuesta.course_id}`
  const enPlan = propuesta.enPlan

  return (
    <li className={cn("grid gap-3 rounded-xl border p-(--card-padding)", fila.incluir && !enPlan ? "border-primary/40 bg-primary/5" : "bg-card")}>
      <label className={cn("flex items-start gap-3", enPlan ? "cursor-default" : "cursor-pointer")}>
        <Checkbox checked={!enPlan && fila.incluir} disabled={Boolean(enPlan)} onCheckedChange={checked => onChange({ incluir: checked === true })}
          aria-describedby={enPlan ? `${id}-en-plan` : undefined} className="mt-0.5" />
        <span className="min-w-0">
          <span className="block text-label-sm text-foreground">{propuesta.nombre}</span>
          {enPlan && <span id={`${id}-en-plan`} className="block text-body-sm text-muted-foreground">Ya en el plan · {MESES[enPlan.mes - 1]}</span>}
        </span>
      </label>

      {!enPlan && fila.incluir && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[10rem_8rem_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-mes`}>Mes</Label>
            <Select value={String(fila.mes)} onValueChange={value => onChange({ mes: Number(value) })}>
              <SelectTrigger id={`${id}-mes`}><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {MESES.map((mes, index) => <SelectItem key={mes} value={String(index + 1)}>{mes}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-tipo`}>Tipo</Label>
            <Select value={fila.tipo} onValueChange={value => onChange({ tipo: value as TipoCurso })}>
              <SelectTrigger id={`${id}-tipo`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="interno">Interno</SelectItem>
                <SelectItem value="externo">Externo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-area`}>Área que solicita</Label>
            <Input id={`${id}-area`} value={fila.area_solicitante} onChange={event => onChange({ area_solicitante: event.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-aplica`}>Aplica para</Label>
            <Input id={`${id}-aplica`} value={fila.aplica_para} onChange={event => onChange({ aplica_para: event.target.value })} />
          </div>
        </div>
      )}
    </li>
  )
}
