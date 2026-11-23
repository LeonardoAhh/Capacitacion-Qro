"use client";

import { Loader2 } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { esPeriodoSemestral } from "@/lib/desempeno/elegibilidad";
import { DESEMPENO } from "@/lib/desempeno/presentation";
import { cn } from "@/lib/utils";
import { evaluationStyles } from "./presentation";
import { empleadoDetalle, type SavedEvaluationsContext } from "./use-saved-evaluations";

const HEAD = "whitespace-nowrap text-eyebrow uppercase";

/**
 * Evaluadas: barra lateral interna con la búsqueda y los departamentos (en móvil,
 * búsqueda y selector arriba) y, a la derecha, los empleados del departamento elegido.
 */
export function SavedHistory({ context }: { context: SavedEvaluationsContext }) {
  const { histSearch, setHistSearch, setSelectedNumero, setDepartamento, historialLoading, loading, gruposPorDepto, grupoActivo } = context;
  const [activo, empleados] = grupoActivo ?? [null, []];

  return <div className="grid items-start gap-6 dense:gap-4 md:grid-cols-[14rem_minmax(0,1fr)]">
    <aside className="flex min-w-0 flex-col gap-3 md:sticky md:top-0 md:max-h-[calc(100dvh-var(--workspace-header-height)-2*var(--workspace-inset))]">
      <SearchInput value={histSearch} onValueChange={setHistSearch} label="Buscar evaluaciones por nombre, número o periodo"
        placeholder="Nombre, número o periodo…" />
      {activo && <Select value={activo} onValueChange={setDepartamento}>
        <SelectTrigger aria-label="Departamento" className="w-full md:hidden"><SelectValue /></SelectTrigger>
        <SelectContent>
          {gruposPorDepto.map(([dep, lista]) => <SelectItem key={dep} value={dep}>{dep} · {lista.length}</SelectItem>)}
        </SelectContent>
      </Select>}
      <nav aria-label="Departamentos" className="hidden min-h-0 flex-1 overflow-y-auto md:block">
        {historialLoading ? <div className="space-y-1" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-(--control-height-sm) w-full" />)}
        </div> : <ul className="space-y-0.5">
          {gruposPorDepto.map(([dep, lista]) => {
            const current = dep === activo;
            return <li key={dep}>
              <button type="button" aria-current={current || undefined} onClick={() => setDepartamento(dep)}
                className={cn("flex min-h-(--control-height-sm) w-full items-center gap-2 rounded-md px-2 text-left text-body-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  current ? "bg-muted text-label-sm text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
                <span className="min-w-0 flex-1 truncate">{dep}</span>
                <span className="shrink-0 text-body-sm tabular-nums text-muted-foreground">{lista.length}</span>
              </button>
            </li>;
          })}
        </ul>}
      </nav>
    </aside>

    <div className="min-w-0 space-y-4 dense:space-y-3">
      {historialLoading ? <div className="space-y-2" aria-label="Cargando evaluaciones">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-(--control-height) w-full" />)}
      </div> : !activo ? <p className={cn(evaluationStyles.description, "rounded-xl border border-dashed px-(--card-padding) py-12 text-center")}>
        {histSearch ? "Sin resultados." : "No hay evaluaciones guardadas."}
      </p> : <div className="overflow-hidden rounded-xl border bg-card">
        {/* Filas de dos líneas iguales: dato principal arriba y secundario abajo, sin saltos de altura. */}
        <Table className="table-fixed">
          <caption className="sr-only">Evaluaciones guardadas de {activo}</caption>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className={HEAD}>Empleado</TableHead>
              <TableHead scope="col" className={cn(HEAD, "hidden w-44 sm:table-cell")}>Último periodo</TableHead>
              <TableHead scope="col" className={cn(HEAD, "w-16 text-right")}>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empleados.map(e => {
              const lastEval = e.evals[0];
              const tipo = lastEval?.periodo && (esPeriodoSemestral(lastEval.periodo) ? DESEMPENO.modes.semestrales : DESEMPENO.modes.mensuales);
              return <TableRow key={e.numero} className="cursor-pointer" onClick={() => setSelectedNumero(e.numero)}>
                <TableCell>
                  {/* El botón da acceso con teclado; toda la fila también responde al clic. */}
                  <button type="button" aria-label={`Ver evaluaciones de ${e.nombre}`}
                    onClick={event => { event.stopPropagation(); setSelectedNumero(e.numero); }}
                    className="block w-full min-w-0 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    <span className="block truncate text-label-sm text-foreground">{e.nombre}</span>
                    <span className="block truncate text-body-sm text-muted-foreground">{empleadoDetalle(e)}</span>
                  </button>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className="block truncate text-body-sm text-foreground">{lastEval?.periodo || "—"}</span>
                  <span className="block truncate text-body-sm text-muted-foreground">{tipo || "—"}</span>
                </TableCell>
                <TableCell className="text-right text-body-sm tabular-nums text-foreground">{e.evals.length}</TableCell>
              </TableRow>;
            })}
          </TableBody>
        </Table>
      </div>}

      {loading && <p role="status" className="flex items-center justify-center gap-2 py-4 text-body-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Cargando evaluación…
      </p>}
    </div>
  </div>;
}
