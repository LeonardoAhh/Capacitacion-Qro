"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { describeSupabaseError } from "@/lib/supabase/errors"
import { addCompletionEvidence } from "./findings-data"
import type { FindingPreview } from "./finding-constraints"
import { FindingFileField } from "./finding-file-field"
import { notify } from "@/lib/notify"

interface CompletionEvidenceDialogProps {
  finding: FindingPreview
  onClose: () => void
  onSaved: () => Promise<void>
}

export function CompletionEvidenceDialog({ finding, onClose, onSaved }: CompletionEvidenceDialogProps) {
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!files.length || saving) return
    setSaving(true)
    try {
      await addCompletionEvidence(finding, files)
      await onSaved()
      onClose()
    } catch (err) {
      notify.error(describeSupabaseError(err, "No se pudo guardar la evidencia"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose() }}>
      <DialogContent footer={
        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="completion-evidence-form" disabled={!files.length} loading={saving}>
            Guardar evidencia
          </Button>
        </DialogFooter>
      }>
        <form id="completion-evidence-form" onSubmit={save} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Evidencia de cumplimiento</DialogTitle>
            <DialogDescription className="truncate" title={finding.title}>{finding.title}</DialogDescription>
          </DialogHeader>
          <FindingFileField label="Archivos" files={files} onChange={setFiles} acceptPdf
            existingCount={finding.completionEvidencePaths.length} disabled={saving} />
        </form>
      </DialogContent>
    </Dialog>
  )
}
