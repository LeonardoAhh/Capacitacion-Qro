"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import type { DncDepartment } from "@/lib/dnc"

interface DncCreateDialogProps {
  anio: number
  disponibles: DncDepartment[]
  onClose: () => void
  onCreate: (departmentId: string) => Promise<void>
}

export function DncCreateDialog({ anio, disponibles, onClose, onCreate }: DncCreateDialogProps) {
  const [departmentId, setDepartmentId] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!departmentId) {
      setError("Selecciona un departamento.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onCreate(departmentId)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear el reporte.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveShell open onClose={onClose} size="sm" title="Crear DNC" description={`Reporte anual ${anio}`}>
      <ModalHeader title="Crear DNC" subtitle={`Año ${anio}`} onClose={onClose} />
      <div className="grid gap-2 p-(--card-padding)">
        <Label htmlFor="dnc-departamento-nuevo">Departamento</Label>
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger id="dnc-departamento-nuevo"><SelectValue placeholder="Selecciona un departamento" /></SelectTrigger>
          <SelectContent matchTriggerWidth>
            {disponibles.map(departamento => (
              <SelectItem key={departamento.id} value={departamento.id}>{departamento.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}
      </div>
      <ModalFooter onCancel={onClose} onConfirm={handleCreate} confirmLabel="Crear reporte" saving={saving} />
    </ResponsiveShell>
  )
}
