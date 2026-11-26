"use client"

import React, { useId, useState, useEffect } from "react"
import { AlertCircle, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { TIPOS_CURSOS } from "@/lib/catalogo"
import type { Course } from "@/lib/hooks"

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
  const [name, setName] = useState('')
  const [tipo, setTipo] = useState<string>('INDUCCIÓN')
  const [duration, setDuration] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && course) {
      setName(course.name)
      setTipo(course.tipo ?? 'INDUCCIÓN')
      setDuration(course.duration_hours != null ? String(course.duration_hours) : '')
      setError(null)
    }
  }, [open, course])

  const handleConfirm = () => {
    if (!course) return
    if (!name.trim()) { setError('El nombre del curso es requerido'); return }
    let durationHours: number | null = null
    if (duration.trim() !== '') {
      const n = Number(duration.replace(',', '.'))
      if (!Number.isFinite(n) || n <= 0) {
        setError('La duración debe ser un número mayor a 0')
        return
      }
      durationHours = Math.round(n * 100) / 100
    }
    setError(null)
    onSave(course.id, { name, tipo, duration_hours: durationHours })
  }

  return (
    <ResponsiveShell
      open={open}
      onClose={onClose}
      size="xs"
      title="Editar curso"
    >
      <ModalHeader
        title="Editar curso"
        subtitle="Actualiza nombre, tipo y duración del curso"
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-4 p-(--card-padding)">
          <div className="space-y-1.5">
            <Label htmlFor={nameId}>Nombre del curso</Label>
            <Input
              id={nameId}
              data-testid="edit-course-name-input"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
              <Label htmlFor={durationId} className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted-foreground" aria-hidden="true" />
                Duración (horas)
              </Label>
              <Input
                id={durationId}
                data-testid="edit-course-duration-input"
                type="number"
                inputMode="decimal"
                step="0.25"
                min="0"
                placeholder="Ej. 1.5"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
              />
            </div>
          </div>

          <p className="text-body-sm text-muted-foreground mt-1">
            Deja vacío para no contar este curso en el KPI de horas.
          </p>

          {error && (
            <Alert variant="destructive" className="py-2 border-destructive/30 bg-destructive/10 text-destructive" data-testid="edit-course-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
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
