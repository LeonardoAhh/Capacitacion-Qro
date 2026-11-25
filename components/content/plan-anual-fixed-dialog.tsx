"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import type { CursoCatalogo, CursoFijo, TipoCurso } from "@/lib/plan-anual"

type Fila = Omit<CursoFijo, "orden"> & { key: number }

interface PlanAnualFixedDialogProps {
  fijos: CursoFijo[]
  anio: number
  catalog: CursoCatalogo[]
  catalogLoading: boolean
  catalogError: string | null
  onClose: () => void
  onSave: (fijos: Omit<CursoFijo, "orden">[]) => Promise<void>
}

/** Lista de cursos que van en todos los meses; al guardar se agregan a los meses iniciados del año. */
export function PlanAnualFixedDialog({ fijos, anio, catalog, catalogLoading, catalogError, onClose, onSave }: PlanAnualFixedDialogProps) {
  const [filas, setFilas] = useState<Fila[]>(() => fijos.map((fijo, key) => ({ ...fijo, key })))
  const [nextKey, setNextKey] = useState(fijos.length)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function actualizar(key: number, cambios: Partial<Fila>) {
    setFilas(current => current.map(fila => fila.key === key ? { ...fila, ...cambios } : fila))
    setError(null)
  }

  function agregar() {
    const anterior = filas.at(-1)
    // La fila nueva repite área, destinatarios y tipo de la anterior: suelen ser los mismos.
    setFilas(current => [...current, {
      key: nextKey, course_id: "",
      area_solicitante: anterior?.area_solicitante ?? "", aplica_para: anterior?.aplica_para ?? "", tipo: anterior?.tipo ?? "interno",
    }])
    setNextKey(key => key + 1)
  }

  async function handleSave() {
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
      await onSave(filas.map(({ course_id, area_solicitante, aplica_para, tipo }) => ({ course_id, area_solicitante, aplica_para, tipo })))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron guardar los cursos fijos.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveShell open onClose={onClose} size="xl" title="Cursos fijos">
      <ModalHeader title="Cursos fijos" subtitle="Se programan todos los meses y se listan primero" onClose={onClose} />
      <div className="grid min-h-0 gap-3 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
        {catalogLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : catalogError
          ? <p role="alert" className="text-body-md text-destructive">{catalogError}</p>
          : (
            <>
              {filas.length === 0 && (
                <p className="rounded-xl border border-dashed px-(--card-padding) py-8 text-center text-body-md text-muted-foreground">Aún no hay cursos fijos.</p>
              )}
              <ol className="grid gap-3">
                {filas.map((fila, index) => {
                  const id = `plan-fijo-${fila.key}`
                  const usados = new Set(filas.filter(otra => otra.key !== fila.key).map(otra => otra.course_id))
                  return (
                    <li key={fila.key} className="grid gap-3 rounded-xl border bg-card p-(--card-padding) lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_8rem_auto] lg:items-end">
                      <div className="grid gap-1.5">
                        <Label htmlFor={`${id}-curso`}>Curso {index + 1}</Label>
                        <Select value={fila.course_id} onValueChange={value => actualizar(fila.key, { course_id: value })}>
                          <SelectTrigger id={`${id}-curso`}><SelectValue placeholder="Selecciona un curso" /></SelectTrigger>
                          <SelectContent matchTriggerWidth className="max-h-60">
                            {catalog.filter(curso => !usados.has(curso.id)).map(curso => <SelectItem key={curso.id} value={curso.id}>{curso.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor={`${id}-area`}>Área que solicita</Label>
                        <Input id={`${id}-area`} value={fila.area_solicitante} maxLength={150} onChange={event => actualizar(fila.key, { area_solicitante: event.target.value })} />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor={`${id}-aplica`}>Aplica para</Label>
                        <Input id={`${id}-aplica`} value={fila.aplica_para} maxLength={150} onChange={event => actualizar(fila.key, { aplica_para: event.target.value })} />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor={`${id}-tipo`}>Tipo</Label>
                        <Select value={fila.tipo} onValueChange={value => actualizar(fila.key, { tipo: value as TipoCurso })}>
                          <SelectTrigger id={`${id}-tipo`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="interno">Interno</SelectItem>
                            <SelectItem value="externo">Externo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="justify-self-end text-muted-foreground hover:text-destructive"
                        aria-label={`Quitar curso fijo ${index + 1}`} onClick={() => setFilas(current => current.filter(otra => otra.key !== fila.key))}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </li>
                  )
                })}
              </ol>
              <Button type="button" variant="outline" className="justify-self-start" onClick={agregar}>
                <Plus aria-hidden="true" />Agregar curso fijo
              </Button>
              <p className="text-body-sm text-muted-foreground">
                Al guardar, los cursos que falten se agregan a los meses ya iniciados de {anio}; los meses que inicies después los traen solos.
                Quitar un curso de la lista no lo borra de los meses donde ya está.
              </p>
            </>
          )}
        {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}
      </div>
      <ModalFooter onCancel={onClose} onConfirm={handleSave} saving={saving} confirmLabel="Guardar cursos fijos"
        confirmDisabled={catalogLoading || Boolean(catalogError)} />
    </ResponsiveShell>
  )
}
