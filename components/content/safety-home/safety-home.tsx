"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, CalendarDays, ClipboardCheck, Hourglass, Loader2, Plus, RotateCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { FilterBar, type FilterFieldDef } from "@/components/ui/filter-token-bar"
import { textoAISO } from "@/lib/fechas"
import { useRole } from "@/lib/hooks/useRole"
import { describeSupabaseError } from "@/lib/supabase/errors"
import { cn } from "@/lib/utils"
import { PanelEmpty } from "@/components/dashboard-panel"
import { CompletionEvidenceDialog } from "./completion-evidence-dialog"
import { CompletionEvidenceViewer } from "./completion-evidence-viewer"
import { CreateFindingDialog } from "./create-finding-dialog"
import { EditFindingDialog } from "./edit-finding-dialog"
import type { FindingPreview } from "./finding-constraints"
import { findingDueDate, isFindingOverdue, isoWeek, sortWeekKeysDesc } from "./finding-constraints"
import { FindingFloatingPanel } from "./finding-detail"
import { FindingList, FindingListSkeleton } from "./finding-list"
import { deleteFinding, loadFindings } from "./findings-data"
import { ImageExpansion } from "./image-expansion"

function weekKeyOf(finding: Pick<FindingPreview, "year" | "week">): string {
  return `${finding.year}-${finding.week}`
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
  const [selectedId, setSelectedId] = useState<string | null>(null)

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
  const selectedIndex = filteredFindings.findIndex((finding) => finding.id === selectedId)
  const selectedFinding = selectedIndex >= 0 ? filteredFindings[selectedIndex] : null

  // El detalle es un modal: se cierra antes de abrir la imagen o la evidencia encima.
  const fromDetail = (action: (finding: FindingPreview) => void) => (finding: FindingPreview) => {
    setSelectedId(null)
    action(finding)
  }

  // Semana: filtro obligatorio (token fijo, solo cambia su valor), como Año y Mes en DNC y Plan Anual.
  const weekField: FilterFieldDef = {
    id: "semana",
    label: "Semana",
    icon: <CalendarDays aria-hidden="true" />,
    operators: [],
    options: populatedWeeks.map((key) => {
      const [year, week] = key.split("-")
      return { value: key, label: `${week} · ${year}` }
    }),
  }

  return (
      <section className="flex flex-col gap-6">
        {/* Filtros a la izquierda y Crear a la derecha, como en Exámenes. */}
        <div className="flex flex-wrap items-center gap-2">
            {selectedWeek && (
              <FilterBar
                hideAdd
                aria-label="Semana de los hallazgos"
                fields={[weekField]}
                value={[{ id: "semana", field: "semana", operator: "is", values: [selectedWeek], locked: true }]}
                disabled={showingOverdue}
                onChange={(next) => {
                  const week = next[0]?.values[0]
                  if (week && week !== selectedWeek) { setSelectedWeek(week); setSelectedId(null) }
                }}
              />
            )}
            {/* Filtro de vencidos (todas las semanas); solo aparece si hay alguno. */}
            {overdueFindings.length > 0 && (
              <Button type="button" variant="outline" size="sm" aria-pressed={showingOverdue}
                className={cn("tabular-nums", showingOverdue && "border-destructive text-destructive hover:text-destructive")}
                onClick={() => { setOnlyOverdue(!showingOverdue); setSelectedId(null) }}>
                <Hourglass aria-hidden="true" />Vencidos {overdueFindings.length}
              </Button>
            )}
            {canEdit && (
              <Button type="button" size="sm" className="ml-auto" onClick={() => setIsCreateOpen(true)}>
                <Plus aria-hidden="true" />Crear
              </Button>
            )}
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


        <div>
          {loading ? (
            <FindingListSkeleton />
          ) : filteredFindings.length > 0 ? (
            <>
              <FindingList
                findings={filteredFindings}
                selectedId={selectedFinding?.id ?? null}
                narrow={false}
                onSelect={(finding) => setSelectedId(finding.id)}
                canEdit={canEdit}
                onEdit={setEditing}
                onDelete={setDeleting}
                onManageCompletion={setManagingCompletion}
              />
              {selectedFinding && (
                <FindingFloatingPanel
                  finding={selectedFinding}
                  navigation={{
                    index: selectedIndex + 1,
                    total: filteredFindings.length,
                    onPrevious: () => setSelectedId(filteredFindings[selectedIndex - 1]?.id ?? selectedId),
                    onNext: () => setSelectedId(filteredFindings[selectedIndex + 1]?.id ?? selectedId),
                  }}
                  onClose={() => setSelectedId(null)}
                  onExpand={fromDetail(setExpandedImage)}
                  onViewCompletion={fromDetail(setExpandedCompletion)}
                />
              )}
            </>
          ) : !error ? (
            <FindingEmptyState canEdit={canEdit} />
          ) : null}
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
                    setFindingPreviews(remaining)
                    setSelectedWeek(nextWeek)
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
  )
}
