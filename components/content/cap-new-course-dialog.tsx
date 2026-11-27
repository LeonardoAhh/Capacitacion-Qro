"use client"

import React, { useId, useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { TIPOS_CURSOS } from "@/lib/catalogo"
import { notify } from "@/lib/notify"

export interface CapNewCourseDialogProps {
  open: boolean
  saving: boolean
  onClose: () => void
  onSave: (name: string, tipo: string, durationHours: number | null) => void
}

export function CapNewCourseDialog({ open, saving, onClose, onSave }: CapNewCourseDialogProps) {
  const nameId = useId()
  const typeId = useId()
  const durationId = useId()
  const [name, setName] = useState('')
  const [tipo, setTipo] = useState<string>('INDUCCIÓN')
  const [duration, setDuration] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mostrarError = (mensaje: string) => {
    setError(mensaje)
    notify.error(mensaje)
  }

  useEffect(() => {
    if (open) { setName(''); setTipo('INDUCCIÓN'); setDuration(''); setError(null) }
  }, [open])

  const handleConfirm = () => {
    if (!name.trim()) { mostrarError('Falta el nombre del curso'); return }
    let durationHours: number | null = null
    if (duration.trim() !== '') {
      const n = Number(duration.replace(',', '.'))
      if (!Number.isFinite(n) || n <= 0) {
        mostrarError('La duración debe ser mayor a 0')
        return
      }
      durationHours = Math.round(n * 100) / 100
    }
    setError(null)
    onSave(name, tipo, durationHours)
  }

  return (
    <ResponsiveShell
      open={open}
      onClose={onClose}
      size="xs"
      title="Nuevo curso"
      description="Agrega un curso al catálogo"
    >
      <ModalHeader
        title="Nuevo curso"
        subtitle="Agrega un curso al catálogo"
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-4 p-(--card-padding)">
          <div className="space-y-1.5">
            <Label htmlFor={nameId}>Nombre del curso</Label>
            <Input
              id={nameId}
              data-testid="new-course-name-input"
              placeholder="Ej. Seguridad industrial básica"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
              aria-invalid={error?.startsWith("El nombre") || undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label id={typeId}>Tipo de curso</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger data-testid="new-course-tipo-select" aria-labelledby={typeId}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent matchTriggerWidth>
                  {TIPOS_CURSOS.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={durationId}>Duración (horas)</Label>
              <Input
                id={durationId}
                data-testid="new-course-duration-input"
                type="number"
                inputMode="decimal"
                step="0.25"
                min="0"
                placeholder="Ej. 1.5"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
                aria-invalid={error?.startsWith("La duración") || undefined}
              />
            </div>
          </div>

        </div>
      </div>

      <ModalFooter
        onCancel={onClose}
        onConfirm={handleConfirm}
        saving={saving}
        confirmLabel="Guardar curso"
      />
    </ResponsiveShell>
  )
}
