"use client"

import { useRef, useState, type ChangeEvent } from "react"
import { FileText, Image as ImageIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { MAX_FINDING_IMAGES } from "./finding-constraints"
import { isCompletionEvidenceFile, isPdfPath, isFindingImageFile } from "./finding-file-types"

interface FindingFileFieldProps {
  label: string
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
  required?: boolean
  existingCount?: number
  acceptPdf?: boolean
}

export function FindingFileField({ label, files, onChange, disabled, required, existingCount = 0, acceptPdf = false }: FindingFileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState("")

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    const valid = selected.filter(acceptPdf ? isCompletionEvidenceFile : isFindingImageFile)
    const accepted = valid.slice(0, Math.max(0, MAX_FINDING_IMAGES - existingCount - files.length))
    setError(selected.length !== valid.length
      ? acceptPdf ? "Solo se permiten imágenes JPG, PNG, WebP o archivos PDF." : "Solo se permiten imágenes JPG, PNG o WebP."
      : accepted.length !== valid.length ? `Puedes agregar máximo ${MAX_FINDING_IMAGES} archivos.` : "")
    onChange([...files, ...accepted])
    event.target.value = ""
  }

  return (
    <div className="space-y-3">
      <div className="flex min-h-11 items-center gap-3">
        <Label>{label}</Label>
        {existingCount + files.length > 0 && <span className="text-body-sm text-muted-foreground">{existingCount + files.length} {existingCount + files.length === 1 ? "archivo" : "archivos"}</span>}
        <Button type="button" variant="outline" size="sm" className="ml-auto" disabled={disabled || existingCount + files.length >= MAX_FINDING_IMAGES}
          onClick={() => inputRef.current?.click()} aria-label={`Agregar ${label.toLowerCase()}`}>
          Agregar
        </Button>
      </div>
      <input ref={inputRef} type="file" accept={acceptPdf
        ? ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
        : ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"}
        multiple className="hidden" onChange={handleChange} disabled={disabled} aria-label={label} />
      {files.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2" aria-label={label}>
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex min-h-11 min-w-0 items-center gap-3 rounded-md border border-border bg-card px-3">
              {isPdfPath(file.name)
                ? <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                : <ImageIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
              <span className="min-w-0 flex-1 truncate text-body-sm" title={file.name}>{file.name}</span>
              <Button type="button" variant="ghost" size="icon" className="shrink-0" disabled={disabled}
                aria-label={`Quitar ${file.name}`} onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))}>
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : required && existingCount === 0 ? (
        <p className="text-body-sm text-muted-foreground">Agrega al menos una imagen.</p>
      ) : null}
      {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}
    </div>
  )
}
