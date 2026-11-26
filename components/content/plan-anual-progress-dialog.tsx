"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DateTextInput } from "@/components/ui/date-text-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { MESES, nombreCursoPlan, type CursoSeguimiento, type DatosSeguimiento } from "@/lib/plan-anual"

interface PlanAnualProgressDialogProps {
  curso: CursoSeguimiento
  canEdit: boolean
  onClose: () => void
  onSave: (datos: DatosSeguimiento) => Promise<void>
}

function showDate(value: string | null): string {
  return value ? value.split("-").reverse().join("/") : "Sin fecha"
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-label-sm text-muted-foreground">{label}</dt>
      <dd className="text-body-md text-foreground">{value}</dd>
    </div>
  )
}

export function PlanAnualProgressDialog({ curso, canEdit, onClose, onSave }: PlanAnualProgressDialogProps) {
  const periodoProgramado = `Del 1 al ${new Date(curso.anio, curso.mes, 0).getDate()} de ${MESES[curso.mes - 1].toLowerCase()} de ${curso.anio}`
  const [reprogramado, setReprogramado] = useState(curso.reprogramado)
  const [fechaReprogramada, setFechaReprogramada] = useState(curso.fecha_reprogramada ?? "")
  const [motivo, setMotivo] = useState(curso.motivo_reprogramacion ?? "")
  const [impartido, setImpartido] = useState(curso.impartido)
  const [fechasImparticion, setFechasImparticion] = useState<string[]>(curso.fechas_imparticion.length ? curso.fechas_imparticion : [""])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (reprogramado && !motivo.trim()) {
      setError("Indica por qué se reprogramó el curso.")
      return
    }
    if (impartido && (fechasImparticion.length === 0 || fechasImparticion.some(fecha => !fecha))) {
      setError("Indica todas las fechas en que se impartió el curso.")
      return
    }
    if (impartido && new Set(fechasImparticion).size !== fechasImparticion.length) {
      setError("No repitas una fecha de impartición.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        reprogramado,
        fecha_reprogramada: reprogramado ? fechaReprogramada || null : null,
        motivo_reprogramacion: reprogramado ? motivo.trim() : null,
        impartido,
        fechas_imparticion: impartido ? [...fechasImparticion].sort() : [],
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el seguimiento.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveShell open onClose={onClose} size="sm" title={nombreCursoPlan(curso)}
      description={`Seguimiento de ${MESES[curso.mes - 1]} ${curso.anio}`}>
      <ModalHeader title={nombreCursoPlan(curso)} subtitle={`${MESES[curso.mes - 1]} ${curso.anio}`} onClose={onClose} />
      {/* Completo aquí lo que en la tabla se recorta a una línea. */}
      <dl className="grid gap-4 border-b px-(--card-padding) py-4 sm:grid-cols-2">
        <Detail label="Área que solicita" value={curso.area_solicitante} />
        <Detail label="Aplica para" value={curso.aplica_para} />
      </dl>
      {canEdit ? (
        <div className="grid gap-4 overflow-y-auto p-(--card-padding) sm:grid-cols-2">
          <div className="grid gap-1 sm:col-span-2">
            <p className="text-label-sm text-muted-foreground">Periodo programado</p>
            <p className="text-body-md text-foreground">{periodoProgramado}</p>
          </div>
          <div className="flex min-h-(--control-height) items-center gap-3">
            <Checkbox id="plan-reprogramado" checked={reprogramado}
              onCheckedChange={checked => setReprogramado(checked === true)} />
            <Label htmlFor="plan-reprogramado" className="flex min-h-(--control-height) flex-1 cursor-pointer items-center">Se reprogramó</Label>
          </div>
          <div className="flex min-h-(--control-height) items-center gap-3">
            <Checkbox id="plan-impartido" checked={impartido}
              onCheckedChange={checked => setImpartido(checked === true)} />
            <Label htmlFor="plan-impartido" className="flex min-h-(--control-height) flex-1 cursor-pointer items-center">Curso impartido</Label>
          </div>
          {reprogramado && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="plan-fecha-reprogramada">Nueva fecha programada</Label>
                <DateTextInput id="plan-fecha-reprogramada" value={fechaReprogramada}
                  onValueChange={setFechaReprogramada} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plan-motivo">Motivo de reprogramación</Label>
                <Textarea id="plan-motivo" value={motivo} onChange={event => setMotivo(event.target.value)}
                  maxLength={1000} placeholder="Describe el motivo" />
              </div>
            </>
          )}
          {impartido && (
            <div className="grid gap-2 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-label-sm text-foreground">Fechas de impartición</span>
                <Button type="button" variant="outline" size="sm"
                  onClick={() => setFechasImparticion(current => [...current, ""])}>
                  <Plus aria-hidden="true" />Agregar fecha
                </Button>
              </div>
              {fechasImparticion.map((fecha, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Label htmlFor={`plan-fecha-imparticion-${index}`} className="sr-only">Fecha de impartición {index + 1}</Label>
                  <DateTextInput id={`plan-fecha-imparticion-${index}`} value={fecha}
                    onValueChange={next => setFechasImparticion(current => current.map((value, position) => position === index ? next : value))} />
                  <Button type="button" variant="ghost" size="icon"
                    aria-label={`Quitar fecha de impartición ${index + 1}`}
                    onClick={() => setFechasImparticion(current => current.filter((_, position) => position !== index))}>
                    <X aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {error && <p role="alert" className="text-body-sm text-destructive sm:col-span-2">{error}</p>}
        </div>
      ) : (
        <dl className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Detail label="Periodo programado" value={periodoProgramado} />
          </div>
          <Detail label="Reprogramado" value={curso.reprogramado ? "Sí" : "No"} />
          <Detail label="Impartido" value={curso.impartido ? "Sí" : "No"} />
          {curso.reprogramado && (
            <>
              <Detail label="Nueva fecha programada" value={showDate(curso.fecha_reprogramada)} />
              <div className="sm:col-span-2">
                <Detail label="Motivo" value={curso.motivo_reprogramacion || "Sin motivo registrado"} />
              </div>
            </>
          )}
          {curso.impartido && (
            <div className="sm:col-span-2">
              <Detail label="Fechas de impartición" value={curso.fechas_imparticion.map(showDate).join(", ")} />
            </div>
          )}
        </dl>
      )}
      <ModalFooter onCancel={onClose} cancelLabel="Cerrar" onConfirm={canEdit ? handleSave : undefined}
        confirmLabel="Guardar seguimiento" saving={saving} />
    </ResponsiveShell>
  )
}
