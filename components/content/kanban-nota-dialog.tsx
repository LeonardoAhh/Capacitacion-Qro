"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { limpiarAlEscribir, MAX_NOTA, normalizarTexto } from "@/lib/kanban"
import { describeSupabaseError } from "@/lib/supabase/errors"

export interface KanbanNotaConfig {
  title: string
  /** Contexto breve: la tarjeta sobre la que se actúa. */
  description: string
  label: string
  required: boolean
  confirmLabel: string
  inicial?: string
  maxLength?: number
  onSave: (texto: string) => Promise<void>
}

/** Texto breve en mayúsculas para pedir apoyo, marcar bloqueo o nombrar una plantilla. */
export function KanbanNotaDialog({ config, onClose }: { config: KanbanNotaConfig; onClose: () => void }) {
  const [texto, setTexto] = useState(config.inicial ?? "")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const maxLength = config.maxLength ?? MAX_NOTA

  async function handleSave() {
    const limpio = normalizarTexto(texto)
    setTexto(limpio)
    if (config.required && !limpio) {
      setError("Completa este campo para continuar.")
      return
    }
    setSaving(true)
    try {
      await config.onSave(limpio)
      onClose()
    } catch (cause) {
      setError(describeSupabaseError(cause, "No se pudo guardar"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveShell open onClose={onClose} size="xs" title={config.title} description={config.description}>
      <ModalHeader title={config.title} onClose={onClose} />
      <form className="grid gap-2 px-4 py-4 sm:px-6"
        onSubmit={event => {
          event.preventDefault()
          void handleSave()
        }}>
        <p className="mb-1 line-clamp-2 break-words text-body-sm text-muted-foreground">{config.description}</p>
        <Label htmlFor="kanban-nota">
          {config.label}{!config.required && <span className="font-normal text-muted-foreground"> (opcional)</span>}
        </Label>
        <Textarea id="kanban-nota" rows={2} className="min-h-(--control-height) resize-none field-sizing-content"
          value={texto} maxLength={maxLength} aria-invalid={Boolean(error)}
          onChange={event => {
            setTexto(limpiarAlEscribir(event.target.value))
            setError(null)
          }}
          onKeyDown={event => {
            // Una sola línea: Enter guarda.
            if (event.key === "Enter") {
              event.preventDefault()
              void handleSave()
            }
          }} />
        {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}
      </form>
      <ModalFooter onCancel={onClose} onConfirm={() => void handleSave()} saving={saving} confirmLabel={config.confirmLabel} />
    </ResponsiveShell>
  )
}
