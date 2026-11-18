import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
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
            <TableCell>{curso.area_solicitante}</TableCell>
            <TableCell>{curso.aplica_para}</TableCell>
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
