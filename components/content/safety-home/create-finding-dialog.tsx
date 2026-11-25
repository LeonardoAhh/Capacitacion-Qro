"use client"

import { useMemo, useState, type FormEvent } from "react"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AutoHeight } from "@/components/ui/auto-height"
import { Button } from "@/components/ui/button"
import { DateTextInput } from "@/components/ui/date-text-input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { JEFES_DE_AREA_POR_DEPARTAMENTO } from "@/lib/catalogos/personal"
import { describeSupabaseError } from "@/lib/supabase/errors"
import {
  FINDING_DEADLINES,
  FINDING_STATUSES,
  isoWeek,
  MAX_FINDING_DESCRIPTION_LENGTH,
  MAX_FINDING_TITLE_LENGTH,
  type FindingDeadline,
  type FindingStatus,
} from "./finding-constraints"
import { FindingFileField } from "./finding-file-field"
import { createFinding } from "./findings-data"

interface CreateFindingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (week: number, year: number) => Promise<void>
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
  const [status, setStatus] = useState<FindingStatus>("Abierto")
  const [deadline, setDeadline] = useState<FindingDeadline | "">("")
  const [dateIso, setDateIso] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const responsibleOptions = department
    ? JEFES_DE_AREA_POR_DEPARTAMENTO[department] ?? []
    : []

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && saving) return
    if (!nextOpen) {
      setDepartment("")
      setResponsible("")
      setTitle("")
      setDescription("")
      setStatus("Abierto")
      setDeadline("")
      setDateIso("")
      setImages([])
      setSubmitted(false)
      setFormError("")
      setStep(1)
    }
    onOpenChange(nextOpen)
  }

  const handleDepartmentChange = (value: string) => {
    setDepartment(value)
    setResponsible("")
    setFormError("")
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSubmitted(true)

    if (step === 1) {
      if (!title.trim() || !description.trim()) {
        setFormError("Completa el título y la descripción para continuar.")
        return
      }
      if (title.trim().length > MAX_FINDING_TITLE_LENGTH || description.length > MAX_FINDING_DESCRIPTION_LENGTH) {
        setFormError("Reduce la longitud del texto al límite permitido.")
        return
      }
      setSubmitted(false)
      setFormError("")
      setStep(2)
      return
    }
    if (step === 2) {
      if (!department || !responsible || !dateIso) {
        setFormError("Selecciona departamento, responsable y una fecha válida (DD/MM/AAAA).")
        return
      }
      setSubmitted(false)
      setFormError("")
      setStep(3)
      return
    }
    if (!deadline) {
      setFormError("Selecciona un plazo de atención.")
      return
    }
    if (images.length === 0) {
      setFormError("Selecciona al menos una imagen del hallazgo.")
      return
    }
    if (!title.trim() || !description.trim() || !department || !responsible || !dateIso) return

    setSaving(true)
    setFormError("")
    try {
      await createFinding(
        {
          title: title.trim(),
          description: description.trim(),
          area: department,
          responsible,
          date: dateIso,
          status,
          deadline,
        },
        images,
      )
      await onCreate(isoWeek(dateIso), Number(dateIso.slice(0, 4)))
      handleOpenChange(false)
    } catch (err) {
      setFormError(describeSupabaseError(err, "No se pudo guardar el hallazgo. Intenta de nuevo."))
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
                  setFormError("")
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
        <form id="create-finding-form" onSubmit={handleSubmit} className="space-y-6" noValidate>
          <DialogHeader className="flex-row items-center justify-between gap-3">
            <DialogTitle>Nuevo hallazgo</DialogTitle>
            <span className="shrink-0 text-body-sm tabular-nums text-muted-foreground" aria-live="polite">Paso {step} de 3</span>
            <DialogDescription className="sr-only">Formulario en tres pasos para registrar un hallazgo de Safe Walk.</DialogDescription>
          </DialogHeader>
          {formError && (
            <Alert variant="destructive" className="bg-destructive/10">
              <AlertCircle className="size-4" aria-hidden="true" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <AutoHeight>
            {step === 1 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="finding-title">Título</Label>
                    <span className="text-body-sm tabular-nums text-muted-foreground">{title.length}/{MAX_FINDING_TITLE_LENGTH}</span>
                  </div>
                  <Input
                    id="finding-title"
                    value={title}
                    maxLength={MAX_FINDING_TITLE_LENGTH}
                    disabled={saving}
                    onChange={(event) => { setTitle(event.target.value); setFormError("") }}
                    aria-invalid={submitted && (!title.trim() || title.trim().length > MAX_FINDING_TITLE_LENGTH)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="finding-description">Descripción</Label>
                    <span className="text-body-sm tabular-nums text-muted-foreground">{description.length}/{MAX_FINDING_DESCRIPTION_LENGTH}</span>
                  </div>
                  <Textarea
                    id="finding-description"
                    value={description}
                    maxLength={MAX_FINDING_DESCRIPTION_LENGTH}
                    disabled={saving}
                    onChange={(event) => { setDescription(event.target.value); setFormError("") }}
                    aria-invalid={submitted && (!description.trim() || description.length > MAX_FINDING_DESCRIPTION_LENGTH)}
                  />
                </div>
              </div>
            ) : step === 2 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="finding-department">Departamento</Label>
                  <Select value={department} onValueChange={handleDepartmentChange} disabled={saving}>
                    <SelectTrigger id="finding-department" aria-invalid={submitted && !department}>
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
                  <Label htmlFor="finding-responsible">Responsable</Label>
                  <Select value={responsible} onValueChange={(value) => { setResponsible(value); setFormError("") }} disabled={saving || !department}>
                    <SelectTrigger id="finding-responsible" aria-invalid={submitted && !responsible}>
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
                  <Select value={status} onValueChange={(value) => setStatus(value as FindingStatus)} disabled={saving}>
                    <SelectTrigger id="finding-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent matchTriggerWidth>
                      {FINDING_STATUSES.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="finding-date">Fecha</Label>
                  <DateTextInput
                    id="finding-date"
                    value={dateIso}
                    disabled={saving}
                    onValueChange={(nextIso) => { setDateIso(nextIso); setFormError("") }}
                    aria-invalid={submitted && !dateIso}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="finding-deadline">Plazo</Label>
                  <Select value={deadline} onValueChange={(value) => { setDeadline(value as FindingDeadline); setFormError("") }} disabled={saving}>
                    <SelectTrigger id="finding-deadline" aria-invalid={submitted && !deadline}>
                      <SelectValue placeholder="Seleccionar plazo" />
                    </SelectTrigger>
                    <SelectContent matchTriggerWidth>
                      {FINDING_DEADLINES.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <FindingFileField label="Imágenes del hallazgo" files={images} onChange={(files) => { setImages(files); setFormError("") }} required disabled={saving} />
              </div>
            )}
          </AutoHeight>
        </form>
      </DialogContent>
    </Dialog>
  )
}
