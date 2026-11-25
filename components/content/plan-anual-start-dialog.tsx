"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { MESES } from "@/lib/plan-anual"

interface PlanAnualStartDialogProps {
  anio: number
  disponibles: number[]
  preferredMonth: number
  onClose: () => void
  onStart: (mes: number) => Promise<void>
}

export function PlanAnualStartDialog({ anio, disponibles, preferredMonth, onClose, onStart }: PlanAnualStartDialogProps) {
  const [mes, setMes] = useState(String(disponibles.includes(preferredMonth) ? preferredMonth : disponibles[0]))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStart() {
    setSaving(true)
    setError(null)
    try {
      await onStart(Number(mes))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo iniciar el mes.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveShell open onClose={onClose} size="sm" title="Iniciar mes">
      <ModalHeader title="Iniciar mes" subtitle={`Plan anual ${anio}`} onClose={onClose} />
      <div className="grid gap-2 p-(--card-padding)">
        <Label htmlFor="plan-mes">Mes de {anio}</Label>
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger id="plan-mes"><SelectValue /></SelectTrigger>
          <SelectContent>
            {disponibles.map(numero => (
              <SelectItem key={numero} value={String(numero)}>{MESES[numero - 1]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-body-sm text-muted-foreground">El mes quedará listo para agregar cursos.</p>
        {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}
      </div>
      <ModalFooter onCancel={onClose} onConfirm={handleStart} confirmLabel="Iniciar mes" saving={saving} />
    </ResponsiveShell>
  )
}
