"use client"

import { useMemo, useState, type FormEvent } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { JEFES_DE_AREA_POR_DEPARTAMENTO } from "@/lib/catalogos/personal"
import type { FindingPreview } from "@/components/content/safety-home/finding-card"
import { createFinding } from "@/components/content/safety-home/findings-data"
import { FindingFileField } from "@/components/content/safety-home/finding-file-field"
import { FINDING_DEADLINES, MAX_FINDING_DESCRIPTION_LENGTH, MAX_FINDING_TITLE_LENGTH, type FindingDeadline } from "@/components/content/safety-home/finding-constraints"

interface CreateFindingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (week: number, date: string) => Promise<void>
}

function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function isValidDate(value: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false
  const [day, month, year] = value.split("/").map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function getIsoWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNumber = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function parseDate(value: string): Date | null {
  if (!isValidDate(value)) return null
  const [day, month, year] = value.split("/").map(Number)
  return new Date(year, month - 1, day)
}

export function CreateFindingDialog({ open, onOpenChange, onCreate }: CreateFindingDialogProps) {
  const departments = useMemo(
    () => Object.keys(JEFES_DE_AREA_POR_DEPARTAMENTO).sort((a, b) => a.localeCompare(b, "es")),
    [],
  )
  const [department, setDepartment] = useState("")
  const [responsible, setResponsible] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<FindingPreview["status"]>("Abierto")
  const [deadline, setDeadline] = useState<FindingDeadline | "">("")
  const [date, setDate] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [imageError, setImageError] = useState("")
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  const responsibleOptions = department
    ? JEFES_DE_AREA_POR_DEPARTAMENTO[department] ?? []
    : []

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDepartment("")
      setResponsible("")
      setTitle("")
      setDescription("")
      setStatus("Abierto")
      setDeadline("")
      setDate("")
      setImages([])
      setSubmitted(false)
      setImageError("")
      setSaveError("")
      setStep(1)
    }
    onOpenChange(nextOpen)
  }

  const handleDepartmentChange = (value: string) => {
    setDepartment(value)
    setResponsible("")
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)

    if (step === 1) {
      if (!title.trim() || title.trim().length > MAX_FINDING_TITLE_LENGTH || !description.trim() || description.length > MAX_FINDING_DESCRIPTION_LENGTH) return
      setSubmitted(false)
      setStep(2)
      return
    }
    const parsedDate = parseDate(date)
    if (step === 2) {
      if (!department || !responsible || !parsedDate) return
      setSubmitted(false)
      setStep(3)
      return
    }
    if (images.length === 0) {
      setImageError("Selecciona al menos una imagen del hallazgo.")
      return
    }
    if (!title.trim() || !description.trim() || !department || !responsible || !parsedDate || !deadline) return

    setSaving(true)
    setSaveError("")
    try {
      await createFinding({ title: title.trim(), description: description.trim(), area: department,
        responsible, date, status, deadline }, images)
      await onCreate(getIsoWeekNumber(parsedDate), date)
      handleOpenChange(false)
    } catch {
      setSaveError("No se pudo guardar el hallazgo. Intenta de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-xl"
        footer={
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                if (step === 1) handleOpenChange(false)
                else {
                  setSubmitted(false)
                  setStep(step === 3 ? 2 : 1)
                }
              }}
            >
              {step === 1 ? "Cancelar" : "Atrás"}
            </Button>
            <Button type="submit" form="create-finding-form" disabled={saving}>
              {saving ? "Guardando…" : step === 3 ? "Crear hallazgo" : "Continuar"}
            </Button>
          </DialogFooter>
        }
      >
        <form id="create-finding-form" onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader className="flex-row items-center justify-between gap-3">
            <DialogTitle>Nuevo hallazgo</DialogTitle>
            <span className="shrink-0 text-body-sm text-muted-foreground" aria-live="polite">Paso {step} de 3</span>
          </DialogHeader>
          {saveError && <p role="alert" className="text-body-sm text-destructive">{saveError}</p>}

          {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="finding-title">Título</Label>
                <span className="text-body-sm text-muted-foreground tabular-nums">{title.length}/{MAX_FINDING_TITLE_LENGTH}</span>
              </div>
              <Input
                id="finding-title"
                value={title}
                maxLength={MAX_FINDING_TITLE_LENGTH}
                onChange={(event) => setTitle(event.target.value)}
                aria-invalid={submitted && (!title.trim() || title.trim().length > MAX_FINDING_TITLE_LENGTH)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="finding-description">Descripción</Label>
                <span className="text-body-sm text-muted-foreground tabular-nums">{description.length}/{MAX_FINDING_DESCRIPTION_LENGTH}</span>
              </div>
              <Textarea
                id="finding-description"
                value={description}
                maxLength={MAX_FINDING_DESCRIPTION_LENGTH}
                onChange={(event) => setDescription(event.target.value)}
                aria-invalid={submitted && (!description.trim() || description.length > MAX_FINDING_DESCRIPTION_LENGTH)}
              />
            </div>

          </div>
          ) : step === 2 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={department} onValueChange={handleDepartmentChange}>
                <SelectTrigger aria-label="Departamento" aria-invalid={submitted && !department}>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent matchTriggerWidth>
                  {departments.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select value={responsible} onValueChange={setResponsible} disabled={!department}>
                <SelectTrigger aria-label="Responsable" aria-invalid={submitted && !responsible}>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent matchTriggerWidth>
                  {responsibleOptions.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="finding-status">Estado</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as FindingPreview["status"])}>
                <SelectTrigger id="finding-status" aria-label="Estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent matchTriggerWidth>
                  <SelectItem value="Abierto">Abierto</SelectItem>
                  <SelectItem value="En seguimiento">En seguimiento</SelectItem>
                  <SelectItem value="Cerrado">Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="finding-date">Fecha</Label>
              <Input
                id="finding-date"
                inputMode="numeric"
                autoComplete="off"
                maxLength={10}
                placeholder="DD/MM/AAAA"
                value={date}
                onChange={(event) => setDate(formatDateInput(event.target.value))}
                aria-invalid={submitted && !isValidDate(date)}
              />
            </div>
          </div>
          ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="finding-deadline">Plazo</Label>
              <Select value={deadline} onValueChange={(value) => setDeadline(value as FindingDeadline)}>
                <SelectTrigger id="finding-deadline" aria-invalid={submitted && !deadline}>
                  <SelectValue placeholder="Seleccionar plazo" />
                </SelectTrigger>
                <SelectContent matchTriggerWidth>
                  {FINDING_DEADLINES.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <FindingFileField label="Imágenes del hallazgo" files={images} onChange={(files) => { setImages(files); setImageError("") }} required disabled={saving} />
            {imageError && <p role="alert" className="text-body-sm text-destructive">{imageError}</p>}
          </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
