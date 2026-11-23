"use client";

import { Layers, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";
import { usePendingEvals, type EmployeePending } from "@/lib/hooks/usePendingEvals";
import { DepartmentPage } from "./department-page";
import { DetailModal } from "./pending-detail";
import { EmployeeBadge } from "./pending-employee";
interface MensualProps {
  loading: boolean;
  deptGroups: ReturnType<typeof usePendingEvals>["deptGroups"];
  totalEmployees: number;
  activeTab: string | null;
  direction: -1 | 1;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
}
export function VistaMensual({
  loading,
  deptGroups,
  totalEmployees,
  activeTab,
  direction,
  selectedId,
  onSelectId
}: MensualProps) {
  const activeGroup = deptGroups.find(g => g.departamento === activeTab) ?? null;
  return <div className="space-y-4">
    {/* All-clear */}
    {!loading && totalEmployees === 0 && <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-success/20 bg-success/5 py-8 text-success">
      <CheckCircle2 className="size-6 opacity-70" aria-hidden="true" />
      <p className="text-sm font-medium">¡Todo al día! Sin evaluaciones pendientes.</p>
    </div>}

    {(loading || deptGroups.length > 0) && <div className="space-y-4">
      {loading ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({
            length: 8
          }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div> : activeGroup ? <DepartmentPage pageKey={activeGroup.departamento} direction={direction}>
          <div className="space-y-3">
          <div className="space-y-4">
            {(() => {
              const getGroupKey = (item: EmployeePending) => {
                const cleanString = (str: string) => {
                  return str.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
                  .replace(/[^A-Z0-9\s]/g, "") // Quitar puntuación (puntos, comas, guiones)
                  .replace(/\s+/g, " ") // Normalizar espacios
                  .trim();
                };
                const parts = [];
                if (item.area && item.area.trim() !== "" && item.area !== "N/A") {
                  parts.push(cleanString(item.area));
                }
                if (item.turno && item.turno.trim() !== "" && item.turno !== "N/A") {
                  const t = cleanString(item.turno);
                  parts.push(t.startsWith("TURNO") ? t : `TURNO ${t}`);
                }
                return parts.length > 0 ? parts.join(" · ") : "GENERAL";
              };
              const grouped = activeGroup.items.reduce((acc, item) => {
                const key = getGroupKey(item);
                if (!acc[key]) acc[key] = [];
                acc[key].push(item);
                return acc;
              }, {} as Record<string, EmployeePending[]>);
              const sortedKeys = Object.keys(grouped).sort((a, b) => {
                if (a === "GENERAL") return 1;
                if (b === "GENERAL") return -1;
                return a.localeCompare(b, "es");
              });
              return sortedKeys.map(key => <div key={key} className="space-y-2">
                  <h4 className="flex items-center gap-2 text-eyebrow uppercase text-muted-foreground">
                    <Layers className="size-3.5" aria-hidden="true" />
                    {key}
                    <span className="text-xs font-normal opacity-70">({grouped[key].length})</span>
                  </h4>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {grouped[key].map(item => <EmployeeBadge key={item.dbId} item={item} isSelected={selectedId === item.dbId} onSelect={() => onSelectId(selectedId === item.dbId ? null : item.dbId)} />)}
                  </div>
                </div>);
            })()}
          </div>

          <Dialog open={!!selectedId} onOpenChange={open => !open && onSelectId(null)}>
            {(() => {
              const current = activeGroup.items.find(i => i.dbId === selectedId);
              return current ? <DetailModal key={current.dbId} item={current} /> : null;
            })()}
          </Dialog>
          </div>
        </DepartmentPage> : null}
    </div>}
  </div>;
}

const LEGEND = [
  { label: "Vencida", className: "bg-destructive" },
  { label: "Pendiente", className: "bg-success" },
] as const;

/** Leyenda de colores de los números de evaluación (va en la barra de la vista). */
export function PendingLegend() {
  return <ul aria-label="Leyenda" className="flex items-center gap-3 text-body-sm text-muted-foreground">
    {LEGEND.map(({ label, className }) => <li key={label} className="flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${className}`} aria-hidden="true" />{label}
    </li>)}
  </ul>;
}
