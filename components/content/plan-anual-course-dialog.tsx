"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import type { CursoCatalogo, CursoPlan, DatosCurso, TipoCurso } from "@/lib/plan-anual"
import { describeSupabaseError } from "@/lib/supabase/errors"

interface PlanAnualCourseDialogProps {
  curso: CursoPlan | null
  mes: string
  /** Catálogo cargado una vez por la página y reutilizado en cada apertura. */
  catalog: CursoCatalogo[]
  catalogLoading: boolean
  catalogError: string | null
  onClose: () => void
  onSave: (datos: DatosCurso) => Promise<void>
}

export function PlanAnualCourseDialog({ curso, mes, catalog, catalogLoading, catalogError, onClose, onSave }: PlanAnualCourseDialogProps) {
  const [courseId, setCourseId] = useState(curso?.course_id ?? "")
  const [area, setArea] = useState(curso?.area_solicitante ?? "")
  const [aplicaPara, setAplicaPara] = useState(curso?.aplica_para ?? "")
  const [tipo, setTipo] = useState<TipoCurso>(curso?.tipo ?? "interno")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const selectedCourse = catalog.find(item => item.id === courseId)
    if (!selectedCourse || !area.trim() || !aplicaPara.trim()) {
      setError("Selecciona un curso del catálogo y completa área solicitante y destinatarios.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({ course_id: selectedCourse.id, nombre: selectedCourse.name,
        area_solicitante: area, aplica_para: aplicaPara, tipo })
    } catch (cause) {
      setError(describeSupabaseError(cause, "No se pudo guardar el curso"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveShell open onClose={onClose} size="sm" title={curso ? "Editar curso" : "Agregar curso"}>
      <ModalHeader title={curso ? "Editar curso" : "Agregar curso"} subtitle={mes} onClose={onClose} />
      <div className="grid gap-4 p-(--card-padding)">
        <div className="grid gap-2">
          <Label htmlFor="plan-curso-nombre">Nombre del curso</Label>
          {catalogLoading ? <Skeleton className="h-(--control-height) w-full" /> : (
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger id="plan-curso-nombre" disabled={Boolean(catalogError) || catalog.length === 0}>
                <SelectValue placeholder="Selecciona un curso del catálogo" />
              </SelectTrigger>
              <SelectContent matchTriggerWidth className="max-h-60">
                {catalog.map(item => <SelectItem key={item.id} value={item.id} title={item.name}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {curso && !curso.course_id && (
            <p className="text-body-sm text-muted-foreground">Nombre anterior: {curso.nombre}. Selecciona su curso del catálogo para vincularlo.</p>
          )}
          {!catalogLoading && catalog.length === 0 && !catalogError && (
            <p className="text-body-sm text-muted-foreground">No hay cursos en el catálogo de Plantilla.</p>
          )}
          {catalogError && <p role="alert" className="text-body-sm text-destructive">{catalogError}</p>}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="plan-curso-area">Área que solicita</Label>
            <Input id="plan-curso-area" value={area} onChange={event => setArea(event.target.value)} maxLength={150} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="plan-curso-aplica">Aplica para</Label>
            <Input id="plan-curso-aplica" value={aplicaPara} onChange={event => setAplicaPara(event.target.value)} maxLength={150} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="plan-curso-tipo">Tipo de curso</Label>
          <Select value={tipo} onValueChange={value => setTipo(value as TipoCurso)}>
            <SelectTrigger id="plan-curso-tipo"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="interno">Interno</SelectItem>
              <SelectItem value="externo">Externo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}
      </div>
      <ModalFooter onCancel={onClose} onConfirm={handleSave} saving={saving}
        confirmDisabled={catalogLoading || Boolean(catalogError) || catalog.length === 0} confirmLabel="Guardar curso" />
    </ResponsiveShell>
  )
}
