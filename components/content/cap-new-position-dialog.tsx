"use client"

import React, { useId, useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import type { Department } from "@/lib/hooks"
import { notify } from "@/lib/notify"

export interface CapNewPositionDialogProps {
  open: boolean
  saving: boolean
  departments: Department[]
  onClose: () => void
  onSave: (name: string, departmentId: string) => void
}

export function CapNewPositionDialog({ open, saving, departments, onClose, onSave }: CapNewPositionDialogProps) {
  const nameId = useId()
  const departmentId = useId()
  const [name, setName] = useState('')
  const [deptId, setDeptId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mostrarError = (mensaje: string) => {
    setError(mensaje)
    notify.error(mensaje)
  }

  useEffect(() => {
    if (open) { setName(''); setDeptId(''); setError(null) }
  }, [open])

  const handleConfirm = () => {
    if (!name.trim()) { mostrarError('Falta el nombre del puesto'); return }
    if (!deptId) { mostrarError('Falta el departamento'); return }
    setError(null)
    onSave(name, deptId)
  }

  return (
    <ResponsiveShell
      open={open}
      onClose={onClose}
      size="xs"
      title="Nuevo puesto"
      description="Agrega un puesto al catálogo"
    >
      <ModalHeader
        title="Nuevo puesto"
        subtitle="Agrega un puesto al catálogo"
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-4 p-(--card-padding)">
          <div className="space-y-1.5">
            <Label htmlFor={nameId}>Nombre del puesto</Label>
            <Input
              id={nameId}
              placeholder="Ej. Operador de producción"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
              aria-invalid={error?.startsWith("El nombre") || undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label id={departmentId}>Departamento</Label>
            <Select value={deptId} onValueChange={setDeptId}>
              <SelectTrigger
                aria-labelledby={departmentId}
                aria-invalid={error?.startsWith("Selecciona") || undefined}
              >
                <SelectValue placeholder="Selecciona departamento" />
              </SelectTrigger>
              <SelectContent matchTriggerWidth>
                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <ModalFooter
        onCancel={onClose}
        onConfirm={handleConfirm}
        saving={saving}
        confirmLabel="Guardar puesto"
      />
    </ResponsiveShell>
  )
}
