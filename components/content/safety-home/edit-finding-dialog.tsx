"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { JEFES_DE_AREA_POR_DEPARTAMENTO } from "@/lib/catalogos/personal"
import type { FindingPreview } from "./finding-card"
import { updateFinding } from "./findings-data"
import { FINDING_DEADLINES, MAX_FINDING_DESCRIPTION_LENGTH, MAX_FINDING_TITLE_LENGTH, type FindingDeadline } from "./finding-constraints"

interface Props {
  finding: FindingPreview
  onClose: () => void
  onSaved: (finding: FindingPreview) => Promise<void>
}

export function EditFindingDialog({ finding, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(finding.title)
  const [description, setDescription] = useState(finding.description)
  const [area, setArea] = useState(finding.area)
  const [responsible, setResponsible] = useState(finding.responsible ?? "")
  const [status, setStatus] = useState(finding.status)
  const [deadline, setDeadline] = useState<FindingDeadline | "">(finding.deadline ?? "")
  const [date, setDate] = useState(finding.date.split("/").reverse().join("-"))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const responsibleOptions = JEFES_DE_AREA_POR_DEPARTAMENTO[area] ?? []

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !description.trim() || !area || !responsible || !date) return
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
    const updated = { ...finding, title: title.trim(), description: description.trim(), area,
      responsible, status, deadline: deadline || null, date: date.split("-").reverse().join("/") }
    try {
      await updateFinding(updated)
      await onSaved(updated)
      onClose()
    } catch {
      setError("No se pudo guardar el hallazgo. Intenta de nuevo.")
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
        <form id="edit-finding-form" onSubmit={save} className="space-y-4">
          <DialogHeader><DialogTitle>Editar hallazgo</DialogTitle></DialogHeader>
          {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="edit-finding-title">Título</Label>
              <span className="text-body-sm text-muted-foreground tabular-nums">{title.length}/{MAX_FINDING_TITLE_LENGTH}</span>
            </div>
            <Input id="edit-finding-title" value={title} maxLength={MAX_FINDING_TITLE_LENGTH}
              aria-invalid={title.trim().length > MAX_FINDING_TITLE_LENGTH}
              onChange={(event) => setTitle(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="edit-finding-description">Descripción</Label>
              <span className="text-body-sm text-muted-foreground tabular-nums">{description.length}/{MAX_FINDING_DESCRIPTION_LENGTH}</span>
            </div>
            <Textarea id="edit-finding-description" value={description} maxLength={MAX_FINDING_DESCRIPTION_LENGTH}
              aria-invalid={description.length > MAX_FINDING_DESCRIPTION_LENGTH}
              onChange={(event) => setDescription(event.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={area} onValueChange={(value) => { setArea(value); setResponsible("") }}>
                <SelectTrigger aria-label="Departamento"><SelectValue /></SelectTrigger>
                <SelectContent matchTriggerWidth>{Object.keys(JEFES_DE_AREA_POR_DEPARTAMENTO).sort((a, b) => a.localeCompare(b, "es")).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select value={responsible} onValueChange={setResponsible} disabled={!area}>
                <SelectTrigger aria-label="Responsable"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent matchTriggerWidth>{responsibleOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as FindingPreview["status"])}>
                <SelectTrigger aria-label="Estado"><SelectValue /></SelectTrigger>
                <SelectContent matchTriggerWidth>
                  <SelectItem value="Abierto">Abierto</SelectItem>
                  <SelectItem value="En seguimiento">En seguimiento</SelectItem>
                  <SelectItem value="Cerrado">Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-finding-date">Fecha</Label>
              <Input id="edit-finding-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-finding-deadline">Plazo</Label>
              <Select value={deadline} onValueChange={(value) => setDeadline(value as FindingDeadline)}>
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
