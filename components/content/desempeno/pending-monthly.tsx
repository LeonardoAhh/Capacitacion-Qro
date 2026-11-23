"use client";

import { CheckCircle2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { usePendingEvals, type EmployeePending } from "@/lib/hooks/usePendingEvals";
import { cn } from "@/lib/utils";
import { DepartmentPage } from "./department-page";
import { DetailModal } from "./pending-detail";
import { PendingName, PendingTable } from "./pending-table";

interface MensualProps {
  loading: boolean;
  deptGroups: ReturnType<typeof usePendingEvals>["deptGroups"];
  totalEmployees: number;
  activeTab: string | null;
  direction: -1 | 1;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
}

const GENERAL = "GENERAL";

const normalizar = (value: string) => value.toUpperCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "")   // acentos
  .replace(/[^A-Z0-9\s]/g, "")       // puntuación
  .replace(/\s+/g, " ")
  .trim();

const valido = (value: string | null): value is string => Boolean(value && value.trim() && value !== "N/A");

/** Grupo de la persona: área y turno ("ALMACEN · TURNO 1"); sin datos, GENERAL. */
function grupoDe(item: EmployeePending): string {
  const parts: string[] = [];
  if (valido(item.area)) parts.push(normalizar(item.area));
  if (valido(item.turno)) {
    const turno = normalizar(item.turno);
    parts.push(turno.startsWith("TURNO") ? turno : `TURNO ${turno}`);
  }
  return parts.length ? parts.join(" · ") : GENERAL;
}

function agrupar(items: EmployeePending[]): [string, EmployeePending[]][] {
  const grupos = new Map<string, EmployeePending[]>();
  for (const item of items) {
    const key = grupoDe(item);
    grupos.set(key, [...(grupos.get(key) ?? []), item]);
  }
  return [...grupos.entries()].sort(([a], [b]) => a === GENERAL ? 1 : b === GENERAL ? -1 : a.localeCompare(b, "es"));
}

// Sin columnas ocultas por breakpoint: las filas de grupo abarcan todas las columnas
// (colSpan) y una columna oculta dejaba un hueco en móvil. El estado va en el color
// del número (ver la leyenda) y en texto para lectores de pantalla.
const COLUMNS = [
  { label: "Empleado" },
  { label: "Pendientes", className: "w-28 text-right" },
];

const LEGEND = [
  { label: "Vencida", className: "bg-destructive" },
  { label: "Pendiente", className: "bg-success" },
] as const;

/** Leyenda de colores del estado (va en la barra de la vista). */
export function PendingLegend() {
  return <ul aria-label="Leyenda" className="flex items-center gap-3 text-body-sm text-muted-foreground">
    {LEGEND.map(({ label, className }) => <li key={label} className="flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", className)} aria-hidden="true" />{label}
    </li>)}
  </ul>;
}

/** Nuevo ingreso: tabla por área y turno; cada fila abre el detalle de sus evaluaciones. */
export function VistaMensual({ loading, deptGroups, totalEmployees, activeTab, direction, selectedId, onSelectId }: MensualProps) {
  const activeGroup = deptGroups.find(g => g.departamento === activeTab) ?? null;
  const current = activeGroup?.items.find(i => i.dbId === selectedId);

  if (loading) return <div className="space-y-2" aria-label="Cargando evaluaciones pendientes">
    {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-(--control-height) w-full" />)}
  </div>;

  if (totalEmployees === 0) return <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-(--card-padding) py-12 text-center">
    <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
    <p className="text-body-md text-muted-foreground">Todo al día: sin evaluaciones pendientes.</p>
  </div>;

  if (!activeGroup) return null;

  return <DepartmentPage pageKey={activeGroup.departamento} direction={direction}>
    <PendingTable caption={`Evaluaciones pendientes de ${activeGroup.departamento}`} columns={COLUMNS}>
      {agrupar(activeGroup.items).map(([grupo, items]) => [
        <TableRow key={grupo} className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={COLUMNS.length} className="py-2 text-eyebrow uppercase text-muted-foreground">
            {grupo} <span className="tabular-nums">· {items.length}</span>
          </TableCell>
        </TableRow>,
        ...items.map(item => {
          const selected = item.dbId === selectedId;
          return <TableRow key={item.dbId} data-state={selected ? "selected" : undefined} className="cursor-pointer" onClick={() => onSelectId(item.dbId)}>
            <TableCell>
              {/* El botón da acceso con teclado; toda la fila también responde al clic. */}
              <button type="button" aria-haspopup="dialog" aria-label={`Ver evaluaciones de ${item.nombre}`}
                onClick={event => { event.stopPropagation(); onSelectId(item.dbId); }}
                className="block w-full min-w-0 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                <PendingName name={item.nombre} detail={`#${item.numero ?? "—"}`} />
              </button>
            </TableCell>
            <TableCell className="text-right">
              <span className={cn("inline-flex items-center gap-1.5 text-label-sm tabular-nums", item.hasVencida ? "text-destructive" : "text-foreground")}>
                <span className={cn("size-2 rounded-full", item.hasVencida ? "bg-destructive" : "bg-success")} aria-hidden="true" />
                {item.evals.length}
                <span className="sr-only">{item.hasVencida ? ", con evaluación vencida" : ", a tiempo"}</span>
              </span>
            </TableCell>
          </TableRow>;
        }),
      ])}
    </PendingTable>

    <Dialog open={!!current} onOpenChange={open => !open && onSelectId(null)}>
      {current ? <DetailModal key={current.dbId} item={current} /> : null}
    </Dialog>
  </DepartmentPage>;
}
