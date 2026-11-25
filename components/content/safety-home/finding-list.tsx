"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { FindingPreview } from "./finding-card"
import { UNASSIGNED_LABEL } from "./finding-constraints"
import { CompletionEvidenceBadge, FindingActionsMenu, FindingBadges } from "./finding-parts"

/**
 * Columnas por ancho de pantalla, con ancho fijo y contenido en una línea
 * (recortado con "…"): Hallazgo toma el resto y nada provoca scroll horizontal.
 * Con el panel de detalle abierto (`narrow`) solo quedan estatus, hallazgo y acciones.
 */
function columns(narrow: boolean) {
  return {
    status: "hidden w-52 md:table-cell",
    area: narrow ? "hidden" : "hidden w-56 lg:table-cell",
    date: narrow ? "hidden" : "hidden w-32 xl:table-cell",
    evidence: narrow ? "hidden" : "hidden w-40 xl:table-cell",
  }
}

const HEAD = "whitespace-nowrap text-eyebrow uppercase"

interface FindingListProps {
  findings: FindingPreview[]
  selectedId: string | null
  /** El panel de detalle ocupa el costado. */
  narrow: boolean
  onSelect: (finding: FindingPreview) => void
  canEdit: boolean
  onEdit: (finding: FindingPreview) => void
  onDelete: (finding: FindingPreview) => void
  onManageCompletion: (finding: FindingPreview) => void
}

export function FindingList({ findings, selectedId, narrow, onSelect, canEdit, onEdit, onDelete, onManageCompletion }: FindingListProps) {
  const col = columns(narrow)
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <Table className="table-fixed">
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(col.status, HEAD)}>Estatus · Plazo</TableHead>
            <TableHead className={HEAD}>Hallazgo</TableHead>
            <TableHead className={cn(col.area, HEAD)}>Área · Responsable</TableHead>
            <TableHead className={cn(col.date, HEAD)}>Fecha</TableHead>
            <TableHead className={cn(col.evidence, HEAD)}>Evidencia</TableHead>
            {canEdit && <TableHead className="w-14 px-1"><span className="sr-only">Acciones</span></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {findings.map((finding) => {
            const selected = finding.id === selectedId
            return (
              <TableRow key={finding.id} data-state={selected ? "selected" : undefined}
                className="cursor-pointer" onClick={() => onSelect(finding)}>
                <TableCell className={col.status}>
                  <FindingBadges finding={finding} nowrap className="flex-col items-start gap-1" />
                </TableCell>
                <TableCell>
                  {/* El botón da acceso con teclado; toda la fila también responde al clic. */}
                  <button type="button" aria-current={selected || undefined}
                    className="block w-full min-w-0 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    onClick={(event) => { event.stopPropagation(); onSelect(finding) }}>
                    <span className="block truncate text-label-sm text-foreground">{finding.title}</span>
                    <span className="block truncate text-body-sm text-muted-foreground">{finding.description}</span>
                  </button>
                  <FindingBadges finding={finding} nowrap className="mt-2 md:hidden" />
                </TableCell>
                <TableCell className={col.area}>
                  <span className="block truncate text-label-sm text-foreground">{finding.area}</span>
                  <span className="block truncate text-body-sm text-muted-foreground">{finding.responsible || UNASSIGNED_LABEL}</span>
                </TableCell>
                <TableCell className={cn(col.date, "whitespace-nowrap text-body-sm tabular-nums text-foreground")}>{finding.date}</TableCell>
                <TableCell className={col.evidence}>
                  <CompletionEvidenceBadge finding={finding} />
                </TableCell>
                {canEdit && (
                  <TableCell className="px-1 py-0 text-center" onClick={(event) => event.stopPropagation()}>
                    <FindingActionsMenu finding={finding} onEdit={onEdit} onDelete={onDelete} onManageCompletion={onManageCompletion} />
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export function FindingListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando hallazgos"
      className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card"
    >
      <span className="sr-only">Cargando hallazgos…</span>
      {Array.from({ length: 4 }, (_, row) => (
        <div key={row} className="grid gap-2 px-(--table-cell-padding-x) py-(--table-cell-padding-y)">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}
