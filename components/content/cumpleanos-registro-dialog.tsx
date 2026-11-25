"use client"

import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { DateTextInput } from "@/components/ui/date-text-input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { normalizeBirthdayDate } from "@/lib/cumpleanos"
import { notify } from "@/lib/notify"

const FIELD = "grid min-w-0 gap-2"

interface CumpleanosRegistroDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

/**
 * Captura de fecha de nacimiento y correo de un colaborador existente, por su número.
 * Usa la misma ruta de importación con un solo registro: valida y guarda en el servidor.
 */
export function CumpleanosRegistroDialog({ open, onOpenChange, onSaved }: CumpleanosRegistroDialogProps) {
  const formId = useId()
  const errorId = `${formId}-error`
  const [numero, setNumero] = useState("")
  const [fecha, setFecha] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // Cambia al cerrar para que la fecha (con su propio texto) empiece vacía.
  const [version, setVersion] = useState(0)

  function close() {
    setNumero("")
    setFecha("")
    setEmail("")
    setError(null)
    setVersion(v => v + 1)
    onOpenChange(false)
  }

  // Mientras guarda no se cierra (Escape, clic fuera ni Cancelar).
  function change(next: boolean) {
    if (saving) return
    if (next) onOpenChange(true)
    else close()
  }

  async function save() {
    const date = normalizeBirthdayDate(fecha)
    if (!fecha || "error" in date) {
      setError("Escribe una fecha de nacimiento válida (DD/MM/AAAA).")
      return
    }
    setError(null)
    setSaving(true)
    try {
      const response = await fetch("/api/cumpleanos/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", registros: [{ numero: numero.trim(), fecha_nacimiento: date.iso, email: email.trim() }] }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? "No se pudo guardar")
      if (payload.noEncontrados?.length) {
        setError(`No encontramos al número ${numero.trim()}.`)
        return
      }
      const result = payload.resultados?.[0] as { nombre: string; ok: boolean; error?: string } | undefined
      if (!result?.ok) throw new Error(result?.error ?? "No se pudo guardar")
      notify.success(`Cumpleaños de ${result.nombre.split(" ")[0]} guardado`)
      onSaved()
      close()
    } catch (saveError) {
      notify.error(saveError instanceof Error ? saveError.message : "No se pudo guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent
        className="sm:max-w-md"
        footer={
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => change(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" form={formId} size="sm" disabled={saving} aria-busy={saving || undefined}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        }
      >
        <DialogHeader>
          <DialogTitle>Nuevo cumpleaños</DialogTitle>
        </DialogHeader>

        <form key={version} id={formId} className="grid gap-4"
          onSubmit={event => { event.preventDefault(); void save() }}>
          <div className={FIELD}>
            <Label htmlFor={`${formId}-numero`}>Número de empleado</Label>
            <Input id={`${formId}-numero`} required maxLength={50} autoComplete="off" inputMode="numeric" className="tabular-nums"
              value={numero} onChange={event => setNumero(event.target.value)} disabled={saving}
              aria-invalid={Boolean(error) || undefined} aria-describedby={error ? errorId : undefined} />
          </div>
          <div className={FIELD}>
            <Label htmlFor={`${formId}-fecha`}>Fecha de nacimiento</Label>
            <DateTextInput id={`${formId}-fecha`} required value={fecha} onValueChange={setFecha} disabled={saving}
              aria-invalid={Boolean(error) || undefined} aria-describedby={error ? errorId : undefined} />
          </div>
          <div className={FIELD}>
            <Label htmlFor={`${formId}-email`}>Correo</Label>
            <Input id={`${formId}-email`} type="email" required maxLength={254} autoComplete="off"
              value={email} onChange={event => setEmail(event.target.value)} disabled={saving} />
          </div>
          {error && <p id={errorId} role="alert" className="text-body-sm text-destructive">{error}</p>}
        </form>
      </DialogContent>
    </Dialog>
  )
}
