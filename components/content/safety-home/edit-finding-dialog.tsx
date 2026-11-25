"use client"

import { useMemo, useState, type FormEvent } from "react"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { DateTextInput } from "@/components/ui/date-text-input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { JEFES_DE_AREA_POR_DEPARTAMENTO } from "@/lib/catalogos/personal"
import { isoATexto, textoAISO } from "@/lib/fechas"
import { describeSupabaseError } from "@/lib/supabase/errors"
import type { FindingPreview } from "./finding-card"
import { updateFinding } from "./findings-data"
import {
  FINDING_DEADLINES,
  FINDING_STATUSES,
  MAX_FINDING_DESCRIPTION_LENGTH,
  MAX_FINDING_TITLE_LENGTH,
  type FindingDeadline,
  type FindingStatus,
} from "./finding-constraints"

interface Props {
  finding: FindingPreview
  onClose: () => void
  onSaved: (finding: FindingPreview) => Promise<void>
}

export function EditFindingDialog({ finding, onClose, onSaved }: Props) {
  const departments = useMemo(
    () => Object.keys(JEFES_DE_AREA_POR_DEPARTAMENTO).sort((a, b) => a.localeCompare(b, "es")),
    [],
  )
  const [title, setTitle] = useState(finding.title)
  const [description, setDescription] = useState(finding.description)
  const [area, setArea] = useState(finding.area)
  const [responsible, setResponsible] = useState(finding.responsible ?? "")
  const [status, setStatus] = useState<FindingStatus>(finding.status)
  const [deadline, setDeadline] = useState<FindingDeadline | "">(finding.deadline ?? "")
  const [dateIso, setDateIso] = useState(() => textoAISO(finding.date) ?? "")
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const responsibleOptions = JEFES_DE_AREA_POR_DEPARTAMENTO[area] ?? []

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSubmitted(true)

    if (!title.trim() || !description.trim() || !area || !responsible || !dateIso) {
      setError("Completa todos los campos obligatorios y verifica la fecha (DD/MM/AAAA).")
      return
    }
    if (title.trim().length > MAX_FINDING_TITLE_LENGTH) {
      setError(`El título debe tener máximo ${MAX_FINDING_TITLE_LENGTH} caracteres.`)
      return
    }
    if (description.length > MAX_FINDING_DESCRIPTION_LENGTH) {
      setError(`La descripción debe tener máximo ${MAX_FINDING_DESCRIPTION_LENGTH} caracteres.`)
      return
    }
    setSaving(true)
    setError("")
    const updated: FindingPreview = {
      ...finding,
      title: title.trim(),
      description: description.trim(),
      area,
      responsible,
      status,
      deadline: deadline || null,
      date: isoATexto(dateIso),
    }
    try {
      await updateFinding(updated)
      await onSaved(updated)
      onClose()
    } catch (err) {
      setError(describeSupabaseError(err, "No se pudo guardar el hallazgo. Intenta de nuevo."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose() }}>
      <DialogContent className="sm:max-w-xl" footer={
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="edit-finding-form" disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</Button>
        </DialogFooter>
      }>
        <form id="edit-finding-form" onSubmit={save} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>Editar hallazgo</DialogTitle>
            <DialogDescription className="sr-only">Actualiza los datos del hallazgo seleccionado.</DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive" className="bg-destructive/10">
              <AlertCircle className="size-4" aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="edit-finding-title">Título</Label>
              <span className="text-body-sm tabular-nums text-muted-foreground">{title.length}/{MAX_FINDING_TITLE_LENGTH}</span>
            </div>
            <Input id="edit-finding-title" value={title} maxLength={MAX_FINDING_TITLE_LENGTH} disabled={saving}
              aria-invalid={submitted && (!title.trim() || title.trim().length > MAX_FINDING_TITLE_LENGTH)}
              onChange={(event) => { setTitle(event.target.value); setError("") }} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="edit-finding-description">Descripción</Label>
              <span className="text-body-sm tabular-nums text-muted-foreground">{description.length}/{MAX_FINDING_DESCRIPTION_LENGTH}</span>
            </div>
            <Textarea id="edit-finding-description" value={description} maxLength={MAX_FINDING_DESCRIPTION_LENGTH} disabled={saving}
              aria-invalid={submitted && (!description.trim() || description.length > MAX_FINDING_DESCRIPTION_LENGTH)}
              onChange={(event) => { setDescription(event.target.value); setError("") }} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-finding-department">Departamento</Label>
              <Select value={area} onValueChange={(value) => { setArea(value); setResponsible(""); setError("") }} disabled={saving}>
                <SelectTrigger id="edit-finding-department" aria-invalid={submitted && !area}><SelectValue /></SelectTrigger>
                <SelectContent matchTriggerWidth>{departments.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-finding-responsible">Responsable</Label>
              <Select value={responsible} onValueChange={(value) => { setResponsible(value); setError("") }} disabled={saving || !area}>
                <SelectTrigger id="edit-finding-responsible" aria-invalid={submitted && !responsible}><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent matchTriggerWidth>{responsibleOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-finding-status">Estado</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as FindingStatus)} disabled={saving}>
                <SelectTrigger id="edit-finding-status"><SelectValue /></SelectTrigger>
                <SelectContent matchTriggerWidth>
                  {FINDING_STATUSES.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-finding-date">Fecha</Label>
              <DateTextInput
                id="edit-finding-date"
                value={dateIso}
                disabled={saving}
                aria-invalid={submitted && !dateIso}
                onValueChange={(nextIso) => { setDateIso(nextIso); setError("") }}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-finding-deadline">Plazo</Label>
              <Select value={deadline} onValueChange={(value) => setDeadline(value as FindingDeadline)} disabled={saving}>
                <SelectTrigger id="edit-finding-deadline"><SelectValue placeholder="Seleccionar plazo" /></SelectTrigger>
                <SelectContent matchTriggerWidth>
                  {FINDING_DEADLINES.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
