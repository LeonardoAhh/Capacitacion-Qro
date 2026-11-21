"use client"

import { useEffect, useMemo, useState } from "react"
import { ImageExpansion } from "@/components/content/safety-home/image-expansion"
import { Button } from "@/components/ui/button"
import { FindingCard, type FindingPreview } from "@/components/content/safety-home/finding-card"
import { CreateFindingDialog } from "@/components/content/safety-home/create-finding-dialog"
import { CompletionEvidenceDialog } from "@/components/content/safety-home/completion-evidence-dialog"
import { CompletionEvidenceViewer } from "@/components/content/safety-home/completion-evidence-viewer"
import { FindingPager } from "@/components/content/safety-home/finding-pager"
import { deleteFinding, loadFindings } from "@/components/content/safety-home/findings-data"
import { EditFindingDialog } from "@/components/content/safety-home/edit-finding-dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRole } from "@/lib/hooks/useRole"
import { Skeleton } from "@/components/ui/skeleton"
import { FINDING_PREVIEW_RATIO } from "@/components/content/safety-home/finding-constraints"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const FINDINGS_PER_PAGE = 2

function FindingSkeletons({ isPreview = false }: { isPreview?: boolean }) {
  const still = isPreview ? "animate-none" : ""
  return (
    <div className="space-y-4" aria-label={isPreview ? "Vista previa de hallazgos" : "Cargando hallazgos"}>
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <Skeleton className={`h-6 w-1/2 ${still}`} />
            <Skeleton className={`h-4 w-full ${still}`} />
            <Skeleton className={`h-4 w-3/4 ${still}`} />
            <div className="grid grid-cols-2 gap-4 pt-4">
              <Skeleton className={`h-4 w-2/3 ${still}`} />
              <Skeleton className={`h-4 w-2/3 ${still}`} />
            </div>
          </div>
          <Skeleton className={`w-full rounded-xl ${still}`} style={{ aspectRatio: String(FINDING_PREVIEW_RATIO) }} />
        </div>
    </div>
  )
}

export function SafetyHome() {
  const { canEdit } = useRole()
  const [findingPreviews, setFindingPreviews] = useState<FindingPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expandedImage, setExpandedImage] = useState<FindingPreview | null>(null)
  const [expandedCompletion, setExpandedCompletion] = useState<FindingPreview | null>(null)
  const [expandedCompletionImage, setExpandedCompletionImage] = useState<{ src: string; evidences: string[]; alt: string } | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editing, setEditing] = useState<FindingPreview | null>(null)
  const [managingCompletion, setManagingCompletion] = useState<FindingPreview | null>(null)
  const [deleting, setDeleting] = useState<FindingPreview | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const populatedWeeks = useMemo(
    () => [...new Set(findingPreviews.map((finding) => `${finding.year}-${finding.week}`))].sort((a, b) => b.localeCompare(a)),
    [findingPreviews],
  )
  const [selectedWeek, setSelectedWeek] = useState("")
  const [page, setPage] = useState(1)
  useEffect(() => {
    let active = true
    loadFindings().then((findings) => {
      if (!active) return
      setFindingPreviews(findings)
      setSelectedWeek((current) => current && findings.some((finding) => `${finding.year}-${finding.week}` === current)
        ? current : findings[0] ? `${findings[0].year}-${findings[0].week}` : "")
      setError("")
    }).catch(() => { if (active) setError("No se pudieron cargar los hallazgos.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const filteredFindings = useMemo(
    () => findingPreviews.filter((finding) => `${finding.year}-${finding.week}` === selectedWeek),
    [findingPreviews, selectedWeek],
  )
  const totalPages = Math.ceil(filteredFindings.length / FINDINGS_PER_PAGE)
  const currentPage = Math.min(page, Math.max(1, totalPages))
  const pageStart = (currentPage - 1) * FINDINGS_PER_PAGE
  const visibleFindings = filteredFindings.slice(pageStart, pageStart + FINDINGS_PER_PAGE)

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={selectedWeek} onValueChange={(value) => { setSelectedWeek(value); setPage(1) }} disabled={!populatedWeeks.length}>
          <SelectTrigger aria-label="Seleccionar semana" className="w-[10rem] sm:w-[12rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent matchTriggerWidth>
            {populatedWeeks.map((key) => (
              <SelectItem key={key} value={key}>
                Semana {key.split("-")[1]} · {key.split("-")[0]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-3">
          <FindingPager page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          {canEdit && <Button type="button" onClick={() => setIsCreateOpen(true)}>Crear</Button>}
        </div>
      </div>

      <div className="space-y-4">
        {error ? <p role="alert" className="text-body-md text-destructive">{error}</p> : loading ? (
          <FindingSkeletons />
        ) : filteredFindings.length > 0 ? (
          visibleFindings.map((finding, index) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              index={pageStart + index}
              onExpand={setExpandedImage}
              onExpandCompletion={setExpandedCompletion}
              onManageCompletion={setManagingCompletion}
              canEdit={canEdit}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          ))
        ) : (
          <FindingSkeletons isPreview />
        )}
      </div>

      {expandedImage && (
        <ImageExpansion
          src={expandedImage.src}
          alt={expandedImage.alt}
          ratio={16 / 9}
          evidences={expandedImage.evidences}
          onClose={() => setExpandedImage(null)}
        />
      )}
      {expandedCompletion && <CompletionEvidenceViewer finding={expandedCompletion} onClose={() => setExpandedCompletion(null)}
        onOpenImage={(src, evidences) => {
          setExpandedCompletionImage({ src, evidences, alt: expandedCompletion.title })
          setExpandedCompletion(null)
        }} />}
      {expandedCompletionImage && <ImageExpansion src={expandedCompletionImage.src} alt={expandedCompletionImage.alt}
        ratio={16 / 9} evidences={expandedCompletionImage.evidences} label="Evidencias de cumplimiento"
        onClose={() => setExpandedCompletionImage(null)} />}

      {editing && <EditFindingDialog key={editing.id} finding={editing} onClose={() => setEditing(null)}
        onSaved={async (updated) => {
          try {
            const findings = await loadFindings()
            setFindingPreviews(findings)
            const saved = findings.find((item) => item.id === updated.id)
            if (saved && `${saved.year}-${saved.week}` !== selectedWeek) {
              setSelectedWeek(`${saved.year}-${saved.week}`)
              setPage(1)
            }
            setError("")
          } catch {
            setError("El hallazgo se guardó, pero no se pudo actualizar la lista. Recarga la página.")
          }
        }} />}

      {managingCompletion && <CompletionEvidenceDialog key={managingCompletion.id} finding={managingCompletion}
        onClose={() => setManagingCompletion(null)}
        onSaved={async () => {
          try {
            setFindingPreviews(await loadFindings())
            setError("")
          } catch {
            setError("La evidencia se guardó, pero no se pudo actualizar la lista. Recarga la página.")
          }
        }} />}

      <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open && !isDeleting) setDeleting(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar hallazgo?</AlertDialogTitle>
            <AlertDialogDescription>Se borrará el hallazgo y sus evidencias.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} className="bg-destructive text-destructive-foreground"
              onClick={async (event) => {
                event.preventDefault()
                if (!deleting) return
                setIsDeleting(true)
                try {
                  await deleteFinding(deleting)
                  setFindingPreviews((current) => current.filter((item) => item.id !== deleting.id))
                  setPage((current) => Math.min(current, Math.max(1, Math.ceil((filteredFindings.length - 1) / FINDINGS_PER_PAGE))))
                  setDeleting(null)
                  setError("")
                } catch {
                  setError("No se pudo borrar el hallazgo.")
                  setDeleting(null)
                } finally {
                  setIsDeleting(false)
                }
              }}>Borrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateFindingDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreate={async (week, date) => {
          try {
            const findings = await loadFindings()
            setFindingPreviews(findings)
            setSelectedWeek(`${date.slice(-4)}-${week}`)
            setPage(1)
            setError("")
          } catch {
            setError("El hallazgo se guardó, pero no se pudo actualizar la lista. Recarga la página.")
          }
        }}
      />
    </section>
  )
}
