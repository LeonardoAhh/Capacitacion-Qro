"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, ClipboardCheck, Hourglass, LayoutGrid, List, Loader2, Plus, RotateCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CompactPager } from "@/components/ui/compact-pager"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LIST_WITH_DETAIL_GRID } from "@/components/ui/side-detail-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { textoAISO } from "@/lib/fechas"
import { useMediaQuery } from "@/lib/hooks/useMediaQuery"
import { useRole } from "@/lib/hooks/useRole"
import { describeSupabaseError } from "@/lib/supabase/errors"
import { cn } from "@/lib/utils"
import { PanelEmpty } from "@/components/dashboard-panel"
import { CompletionEvidenceDialog } from "./completion-evidence-dialog"
import { CompletionEvidenceViewer } from "./completion-evidence-viewer"
import { CreateFindingDialog } from "./create-finding-dialog"
import { EditFindingDialog } from "./edit-finding-dialog"
import { FindingCard, type FindingPreview } from "./finding-card"
import { FINDING_PREVIEW_RATIO, findingDueDate, isFindingOverdue, isoWeek, sortWeekKeysDesc } from "./finding-constraints"
import { FINDING_DETAIL_SIDE_QUERY, FindingDetailPanel } from "./finding-detail"
import { FindingList, FindingListSkeleton } from "./finding-list"
import { deleteFinding, loadFindings } from "./findings-data"
import { ImageExpansion } from "./image-expansion"

const FINDINGS_PER_PAGE = 2

type FindingsView = "tarjetas" | "lista"
const VIEW_TRIGGER = "gap-1.5 max-sm:flex-1 [&_svg]:size-4 [&_svg]:shrink-0"

function weekKeyOf(finding: Pick<FindingPreview, "year" | "week">): string {
  return `${finding.year}-${finding.week}`
}

function FindingSkeletons() {
  return (
    <div role="status" className="space-y-4" aria-label="Cargando hallazgos">
      <span className="sr-only">Cargando hallazgos…</span>
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="space-y-4 p-(--card-padding)">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="grid grid-cols-2 gap-4 pt-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </Card>
        <Skeleton className="w-full rounded-xl" style={{ aspectRatio: String(FINDING_PREVIEW_RATIO) }} />
      </div>
    </div>
  )
}

/** Sin hallazgos: el botón Crear de la barra ya es la acción, aquí no se repite. */
function FindingEmptyState({ canEdit }: { canEdit: boolean }) {
  return (
    <PanelEmpty
      icon={<ClipboardCheck className="size-6 text-muted-foreground" aria-hidden="true" />}
      title="Sin hallazgos registrados."
      hint={canEdit ? "Registra el primero con Crear." : "Aún no hay hallazgos publicados para esta semana."}
    />
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
    () => sortWeekKeysDesc([...new Set(findingPreviews.map(weekKeyOf))]),
    [findingPreviews],
  )
  const [selectedWeek, setSelectedWeek] = useState("")
  /** Solo vencidos, de todas las semanas: los atrasados casi nunca son de la semana actual. */
  const [onlyOverdue, setOnlyOverdue] = useState(false)
  const [page, setPage] = useState(1)
  const [view, setView] = useState<FindingsView>("lista")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const detailSide = useMediaQuery(FINDING_DETAIL_SIDE_QUERY)

  const refreshFindings = useCallback(async (preferredWeek?: string, fallbackError = "No se pudieron cargar los hallazgos") => {
    try {
      const findings = await loadFindings()
      const weeks = sortWeekKeysDesc([...new Set(findings.map(weekKeyOf))])
      setFindingPreviews(findings)
      setSelectedWeek((current) => {
        if (preferredWeek && weeks.includes(preferredWeek)) return preferredWeek
        if (current && weeks.includes(current)) return current
        return weeks[0] ?? ""
      })
      if (preferredWeek) setPage(1)
      setError("")
    } catch (err) {
      setError(describeSupabaseError(err, fallbackError))
    }
  }, [])

  useEffect(() => {
    let active = true
    loadFindings().then((findings) => {
      if (!active) return
      const weeks = sortWeekKeysDesc([...new Set(findings.map(weekKeyOf))])
      setFindingPreviews(findings)
      setSelectedWeek((current) => (current && weeks.includes(current) ? current : weeks[0] ?? ""))
      setError("")
    }).catch((err) => {
      if (active) setError(describeSupabaseError(err, "No se pudieron cargar los hallazgos"))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  const overdueFindings = useMemo(
    () => findingPreviews
      .filter((finding) => isFindingOverdue(finding))
      .sort((a, b) => (findingDueDate(a) ?? "").localeCompare(findingDueDate(b) ?? "")),
    [findingPreviews],
  )
  const showingOverdue = onlyOverdue && overdueFindings.length > 0
  const filteredFindings = useMemo(
    () => showingOverdue ? overdueFindings : findingPreviews.filter((finding) => weekKeyOf(finding) === selectedWeek),
    [showingOverdue, overdueFindings, findingPreviews, selectedWeek],
  )
  const totalPages = Math.ceil(filteredFindings.length / FINDINGS_PER_PAGE)
  const currentPage = Math.min(page, Math.max(1, totalPages))
  const pageStart = (currentPage - 1) * FINDINGS_PER_PAGE
  const visibleFindings = filteredFindings.slice(pageStart, pageStart + FINDINGS_PER_PAGE)
  const selectedFinding = filteredFindings.find((finding) => finding.id === selectedId) ?? null

  const fromDetail = (action: (finding: FindingPreview) => void) => (finding: FindingPreview) => {
    if (!detailSide) setSelectedId(null)
    action(finding)
  }

  return (
    <Tabs asChild value={view} onValueChange={(value) => setView(value as FindingsView)}>
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <TabsList aria-label="Vista de hallazgos" className="max-sm:w-full">
            <TabsTrigger value="lista" className={VIEW_TRIGGER}>
              <List aria-hidden="true" />Lista
            </TabsTrigger>
            <TabsTrigger value="tarjetas" className={VIEW_TRIGGER}>
              <LayoutGrid aria-hidden="true" />Tarjetas
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {/* Filtro de vencidos (todas las semanas); solo aparece si hay alguno. */}
            {overdueFindings.length > 0 && (
              <Button type="button" variant="outline" size="sm" aria-pressed={showingOverdue}
                className={cn("tabular-nums", showingOverdue && "border-destructive text-destructive hover:text-destructive")}
                onClick={() => { setOnlyOverdue(!showingOverdue); setPage(1); setSelectedId(null) }}>
                <Hourglass aria-hidden="true" />Vencidos {overdueFindings.length}
              </Button>
            )}
            <Select value={selectedWeek} onValueChange={(value) => { setSelectedWeek(value); setPage(1); setSelectedId(null) }} disabled={!populatedWeeks.length || showingOverdue}>
              <SelectTrigger variant="ghost" size="sm" aria-label="Seleccionar semana" className="font-medium max-sm:min-w-0 max-sm:flex-1 max-sm:justify-between">
                <SelectValue placeholder="Sin semanas" />
              </SelectTrigger>
              <SelectContent matchTriggerWidth>
                {populatedWeeks.map((key) => {
                  const [year, week] = key.split("-")
                  return (
                    <SelectItem key={key} value={key}>
                      Semana {week} · {year}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>

            {view === "tarjetas" && (
              <CompactPager label="Paginación de hallazgos" page={currentPage} totalPages={totalPages} onPageChange={setPage} />
            )}

            {canEdit && (
              <Button type="button" size="sm" onClick={() => setIsCreateOpen(true)}>
                <Plus aria-hidden="true" />Crear
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="flex flex-wrap items-center justify-between gap-3 bg-destructive/10 [&>svg]:top-1/2 [&>svg]:-translate-y-1/2">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertDescription className="min-w-0 flex-1">{error}</AlertDescription>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => {
                setLoading(true)
                void refreshFindings().finally(() => setLoading(false))
              }}
            >
              <RotateCw aria-hidden="true" />Reintentar
            </Button>
          </Alert>
        )}

        <TabsContent value="tarjetas" className="mt-0 space-y-4">
          {loading ? (
            <FindingSkeletons />
          ) : filteredFindings.length > 0 ? (
            visibleFindings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                onExpand={setExpandedImage}
                onExpandCompletion={setExpandedCompletion}
                onManageCompletion={setManagingCompletion}
                canEdit={canEdit}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            ))
          ) : !error ? (
            <FindingEmptyState canEdit={canEdit} />
          ) : null}
        </TabsContent>

        <TabsContent value="lista" className="mt-0">
          {loading ? (
            <FindingListSkeleton />
          ) : filteredFindings.length > 0 ? (
            <div className={selectedFinding && detailSide ? LIST_WITH_DETAIL_GRID : undefined}>
              <FindingList
                findings={filteredFindings}
                selectedId={selectedFinding?.id ?? null}
                narrow={!!selectedFinding && detailSide}
                onSelect={(finding) => setSelectedId(finding.id)}
                canEdit={canEdit}
                onEdit={setEditing}
                onDelete={setDeleting}
                onManageCompletion={setManagingCompletion}
              />
              {selectedFinding && (
                <FindingDetailPanel
                  key={selectedFinding.id}
                  side={detailSide}
                  finding={selectedFinding}
                  onClose={() => setSelectedId(null)}
                  onExpand={fromDetail(setExpandedImage)}
                  onViewCompletion={fromDetail(setExpandedCompletion)}
                />
              )}
            </div>
          ) : !error ? (
            <FindingEmptyState canEdit={canEdit} />
          ) : null}
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
        {expandedCompletion && (
          <CompletionEvidenceViewer
            finding={expandedCompletion}
            onClose={() => setExpandedCompletion(null)}
            onOpenImage={(src, evidences) => {
              setExpandedCompletionImage({ src, evidences, alt: expandedCompletion.title })
              setExpandedCompletion(null)
            }}
          />
        )}
        {expandedCompletionImage && (
          <ImageExpansion
            src={expandedCompletionImage.src}
            alt={expandedCompletionImage.alt}
            ratio={16 / 9}
            evidences={expandedCompletionImage.evidences}
            label="Evidencias de cumplimiento"
            onClose={() => setExpandedCompletionImage(null)}
          />
        )}

        {editing && (
          <EditFindingDialog
            key={editing.id}
            finding={editing}
            onClose={() => setEditing(null)}
            onSaved={async (updated) => {
              const iso = textoAISO(updated.date)
              const updatedWeek = iso ? `${iso.slice(0, 4)}-${isoWeek(iso)}` : undefined
              await refreshFindings(
                updatedWeek && updatedWeek !== selectedWeek ? updatedWeek : undefined,
                "El hallazgo se guardó, pero no se pudo actualizar la lista. Recarga la página.",
              )
            }}
          />
        )}

        {managingCompletion && (
          <CompletionEvidenceDialog
            key={managingCompletion.id}
            finding={managingCompletion}
            onClose={() => setManagingCompletion(null)}
            onSaved={() => refreshFindings(undefined, "La evidencia se guardó, pero no se pudo actualizar la lista. Recarga la página.")}
          />
        )}

        <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open && !isDeleting) setDeleting(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Borrar hallazgo?</AlertDialogTitle>
              <AlertDialogDescription>Se borrará el hallazgo y sus evidencias.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                aria-busy={isDeleting || undefined}
                className="bg-destructive text-destructive-foreground ui-hover-destructive"
                onClick={async (event) => {
                  event.preventDefault()
                  if (!deleting) return
                  setIsDeleting(true)
                  try {
                    await deleteFinding(deleting)
                    const remaining = findingPreviews.filter((item) => item.id !== deleting.id)
                    const remainingWeeks = sortWeekKeysDesc([...new Set(remaining.map(weekKeyOf))])
                    const nextWeek = remainingWeeks.includes(selectedWeek) ? selectedWeek : remainingWeeks[0] ?? ""
                    const nextWeekCount = remaining.filter((item) => weekKeyOf(item) === nextWeek).length
                    setFindingPreviews(remaining)
                    setSelectedWeek(nextWeek)
                    setPage((current) => Math.min(current, Math.max(1, Math.ceil(nextWeekCount / FINDINGS_PER_PAGE))))
                    setDeleting(null)
                    setError("")
                  } catch (err) {
                    setError(describeSupabaseError(err, "No se pudo borrar el hallazgo"))
                    setDeleting(null)
                  } finally {
                    setIsDeleting(false)
                  }
                }}
              >
                {isDeleting && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                Borrar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <CreateFindingDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onCreate={(week, year) =>
            refreshFindings(
              `${year}-${week}`,
              "El hallazgo se guardó, pero no se pudo actualizar la lista. Recarga la página.",
            )
          }
        />
      </section>
    </Tabs>
  )
}
