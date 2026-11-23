"use client"

import { useEffect, useMemo, useState } from "react"
import { LayoutGrid, List } from "lucide-react"
import { ImageExpansion } from "@/components/content/safety-home/image-expansion"
import { Button } from "@/components/ui/button"
import { FindingCard, type FindingPreview } from "@/components/content/safety-home/finding-card"
import { CreateFindingDialog } from "@/components/content/safety-home/create-finding-dialog"
import { CompletionEvidenceDialog } from "@/components/content/safety-home/completion-evidence-dialog"
import { CompletionEvidenceViewer } from "@/components/content/safety-home/completion-evidence-viewer"
import { CompactPager } from "@/components/ui/compact-pager"
import { deleteFinding, loadFindings } from "@/components/content/safety-home/findings-data"
import { EditFindingDialog } from "@/components/content/safety-home/edit-finding-dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRole } from "@/lib/hooks/useRole"
import { Skeleton } from "@/components/ui/skeleton"
import { FINDING_PREVIEW_RATIO } from "@/components/content/safety-home/finding-constraints"
import { FindingList, FindingListSkeleton } from "@/components/content/safety-home/finding-list"
import { FINDING_DETAIL_SIDE_QUERY, FindingDetailPanel } from "@/components/content/safety-home/finding-detail"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMediaQuery } from "@/lib/hooks/useMediaQuery"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const FINDINGS_PER_PAGE = 2

type FindingsView = "tarjetas" | "lista"
const VIEW_TRIGGER = "gap-1.5 [&_svg]:size-4 [&_svg]:shrink-0"

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
  const { canManageSafety: canEdit } = useRole()
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
  const [view, setView] = useState<FindingsView>("lista")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const detailSide = useMediaQuery(FINDING_DETAIL_SIDE_QUERY)
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
  // Se deriva de la semana visible: si el hallazgo se borra o cambia de semana, el panel se cierra solo.
  const selectedIndex = filteredFindings.findIndex((finding) => finding.id === selectedId)
  const selectedFinding = selectedIndex >= 0 ? filteredFindings[selectedIndex] : null
  /** En la hoja inferior, las acciones abren su propio diálogo: primero se cierra la hoja. */
  const fromDetail = (action: (finding: FindingPreview) => void) => (finding: FindingPreview) => {
    if (!detailSide) setSelectedId(null)
    action(finding)
  }

  return (
    <Tabs asChild value={view} onValueChange={(value) => setView(value as FindingsView)}>
    <section className="flex flex-col gap-6">
      {/* gap y no space-y: el panel inactivo de las pestañas sigue en el DOM (oculto) y space-y le sumaría margen al visible. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedWeek} onValueChange={(value) => { setSelectedWeek(value); setPage(1); setSelectedId(null) }} disabled={!populatedWeeks.length}>
            <SelectTrigger variant="ghost" aria-label="Seleccionar semana" className="font-medium">
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

          <TabsList aria-label="Vista de hallazgos">
            <TabsTrigger value="lista" className={VIEW_TRIGGER}>
              <List aria-hidden="true" /><span className="sr-only sm:not-sr-only">Lista</span>
            </TabsTrigger>
            <TabsTrigger value="tarjetas" className={VIEW_TRIGGER}>
              <LayoutGrid aria-hidden="true" /><span className="sr-only sm:not-sr-only">Tarjetas</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex items-center gap-3">
          {view === "tarjetas" && <CompactPager label="Paginación de hallazgos" page={currentPage} totalPages={totalPages} onPageChange={setPage} />}
          {canEdit && <Button type="button" onClick={() => setIsCreateOpen(true)}>Crear</Button>}
        </div>
      </div>

      {error && <p role="alert" className="text-body-md text-destructive">{error}</p>}

      <TabsContent value="tarjetas" className="mt-0 space-y-4">
        {error ? null : loading ? (
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
      </TabsContent>

      <TabsContent value="lista" className="mt-0">
        {error ? null : loading ? (
          <FindingListSkeleton />
        ) : filteredFindings.length > 0 ? (
          <div className={selectedFinding && detailSide
            ? "grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_28rem] 2xl:grid-cols-[minmax(0,1fr)_32rem]"
            : undefined}>
            <FindingList findings={filteredFindings} selectedId={selectedFinding?.id ?? null}
              narrow={!!selectedFinding && detailSide}
              onSelect={(finding) => setSelectedId(finding.id)}
              canEdit={canEdit} onEdit={setEditing} onDelete={setDeleting} />
            {selectedFinding && (
              <FindingDetailPanel
                key={selectedFinding.id}
                side={detailSide}
                finding={selectedFinding}
                index={selectedIndex}
                onClose={() => setSelectedId(null)}
                onExpand={fromDetail(setExpandedImage)}
              />
            )}
          </div>
        ) : (
          <FindingListSkeleton isPreview />
        )}
      </TabsContent>

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
    </Tabs>
  )
}
