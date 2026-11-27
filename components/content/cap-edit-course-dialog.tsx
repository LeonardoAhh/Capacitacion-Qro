"use client"

import { useId, useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { TIPOS_CURSOS } from "@/lib/catalogo"
import type { Course } from "@/lib/hooks"
import { notify } from "@/lib/notify"

export interface CapEditCourseDialogProps {
  course: Course | null
  open: boolean
  saving: boolean
  onClose: () => void
  onSave: (id: string, data: { name: string; tipo: string; duration_hours: number | null }) => void
}

export function CapEditCourseDialog({ course, open, saving, onClose, onSave }: CapEditCourseDialogProps) {
  const nameId = useId()
  const typeId = useId()
  const durationId = useId()
  const durationHintId = useId()
  const [name, setName] = useState('')
  const [tipo, setTipo] = useState<string>('INDUCCIÓN')
  const [duration, setDuration] = useState('')

  useEffect(() => {
    if (open && course) {
      setName(course.name)
      setTipo(course.tipo ?? 'INDUCCIÓN')
      setDuration(course.duration_hours != null ? String(course.duration_hours) : '')
    }
  }, [open, course])

  const handleConfirm = () => {
    if (!course) return
    if (!name.trim()) { notify.error('Falta el nombre del curso'); return }
    let durationHours: number | null = null
    if (duration.trim() !== '') {
      const n = Number(duration.replace(',', '.'))
      if (!Number.isFinite(n) || n <= 0) {
        notify.error('La duración debe ser mayor a 0')
        return
      }
      durationHours = Math.round(n * 100) / 100
    }
    onSave(course.id, { name, tipo, duration_hours: durationHours })
  }

  return (
    <ResponsiveShell
      open={open}
      onClose={onClose}
      size="xs"
      title="Editar curso"
    >
      <ModalHeader title="Editar curso" onClose={onClose} />

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-4 p-(--card-padding)">
          <div className="space-y-2">
            <Label htmlFor={nameId}>Nombre del curso</Label>
            <Input
              id={nameId}
              data-testid="edit-course-name-input"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
            />
          </div>

          {/* Tipo y duración en una fila. */}
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label id={typeId}>Tipo de curso</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger data-testid="edit-course-tipo-select" aria-labelledby={typeId}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent matchTriggerWidth>
                  {TIPOS_CURSOS.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor={durationId}>Duración (horas)</Label>
              <Input
                id={durationId}
                data-testid="edit-course-duration-input"
                type="number"
                inputMode="decimal"
                step="0.25"
                min="0"
                placeholder="Opcional"
                value={duration}
                aria-describedby={durationHintId}
                onChange={e => setDuration(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
              />
              {/* El texto de ejemplo desaparece al escribir: la explicación queda para lectores de pantalla. */}
              <p id={durationHintId} className="sr-only">
                Déjala vacía si el curso no cuenta en las horas de capacitación.
              </p>
            </div>
          </div>

        </div>
      </div>
      <ModalFooter
        onCancel={onClose}
        onConfirm={handleConfirm}
        saving={saving}
        confirmLabel="Guardar cambios"
      />
    </ResponsiveShell>
  )
}
