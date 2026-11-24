import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { TruncatedText } from "@/components/ui/truncated-text"
import { nombreCursoPlan, type CursoPlan } from "@/lib/plan-anual"
import { PlanAnualActionsMenu } from "@/components/content/plan-anual-actions-menu"

interface PlanAnualTableProps {
  cursos: CursoPlan[]
  canEdit: boolean
  onOpen: (curso: CursoPlan) => void
  onMetrics: (curso: CursoPlan) => void
  onEdit: (curso: CursoPlan) => void
  onDelete: (curso: CursoPlan) => void
}

const CELDA_LISTA = "line-clamp-1 max-w-56"

export function PlanAnualTable({ cursos, canEdit, onOpen, onMetrics, onEdit, onDelete }: PlanAnualTableProps) {
  return (
    <Table aria-label={cursos.length ? "Cursos del mes" : "Cursos del mes, sin registros"}
      className="min-w-max [&_td]:px-3 [&_td]:py-1 [&_th]:h-9 [&_th]:px-3">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead rowSpan={2} scope="col" className="w-2/5">Nombre del curso</TableHead>
          <TableHead rowSpan={2} scope="col">Área que solicita</TableHead>
          <TableHead rowSpan={2} scope="col">Aplica para</TableHead>
          <TableHead colSpan={2} scope="colgroup" className="text-center">Tipo de curso</TableHead>
          <TableHead rowSpan={2} scope="col" className="text-right">Acciones</TableHead>
        </TableRow>
        <TableRow className="hover:bg-transparent">
          <TableHead scope="col" className="text-center">Interno</TableHead>
          <TableHead scope="col" className="text-center">Externo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cursos.length === 0 && [1, 2, 3].map(number => (
          <TableRow key={number} aria-hidden="true" className="hover:bg-transparent">
            <TableCell className="min-w-64"><Skeleton className="h-4 w-48 animate-none" /></TableCell>
            <TableCell><Skeleton className="h-4 w-28 animate-none" /></TableCell>
            <TableCell><Skeleton className="h-4 w-28 animate-none" /></TableCell>
            <TableCell><Skeleton className="mx-auto h-4 w-4 animate-none" /></TableCell>
            <TableCell><Skeleton className="mx-auto h-4 w-4 animate-none" /></TableCell>
            <TableCell><Skeleton className="ml-auto h-4 w-4 animate-none" /></TableCell>
          </TableRow>
        ))}
        {cursos.map(curso => (
          <TableRow key={curso.id}>
            <TableCell className="min-w-64 max-w-lg whitespace-normal font-medium">{nombreCursoPlan(curso)}</TableCell>
            {/* Una línea por celda; si no cabe, el texto abre el detalle del curso con todo el contenido. */}
            <TableCell>
              <TruncatedText className={CELDA_LISTA} onExpand={() => onOpen(curso)} expandLabel="Ver áreas que solicitan">{curso.area_solicitante}</TruncatedText>
            </TableCell>
            <TableCell>
              <TruncatedText className={CELDA_LISTA} onExpand={() => onOpen(curso)} expandLabel="Ver a quién aplica">{curso.aplica_para}</TruncatedText>
            </TableCell>
            <TableCell className="text-center">{curso.tipo === "interno" ? "Sí" : "—"}</TableCell>
            <TableCell className="text-center">{curso.tipo === "externo" ? "Sí" : "—"}</TableCell>
            <TableCell className="text-right">
              <PlanAnualActionsMenu curso={curso} canEdit={canEdit} onOpen={onOpen} onMetrics={onMetrics}
                onEdit={onEdit} onDelete={onDelete} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
