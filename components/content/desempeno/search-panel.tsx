"use client";

import { useId, type ReactNode } from "react";
import { DESEMPENO, SEARCH_OPTIONS } from "@/lib/desempeno/presentation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { esPeriodoSemestral } from "@/lib/desempeno/elegibilidad";
import type { EvaluationSearchContext } from "./use-evaluation-search";
import { ActionButton } from "./search-controls";
import { Skeleton } from "@/components/ui/skeleton";
/** Buscador de la evaluación: búsqueda, periodo y acciones de la vista en una sola fila. */
export function SearchPanel({
  context,
  actions
}: {
  context: EvaluationSearchContext;
  /** Acciones de la vista (Practicar, Vencidas…), al final de la fila. */
  actions?: ReactNode;
}) {
  const searchId = useId();
  const listId = `${searchId}-options`;
  const searchLength = context.numeroBuscado.trim().length;
  const expanded = context.showSugg && searchLength >= SEARCH_OPTIONS.minLength;
  const showMinLengthHint = context.showSugg && searchLength > 0 && searchLength < SEARCH_OPTIONS.minLength;
  const {
    loading,
    numeroBuscado,
    setNumeroBuscado,
    periodoVisible,
    data,
    existingEvaluation,
    inputRef,
    suggestions,
    suggestionError,
    setSuggestions,
    suggLoading,
    setShowSugg,
    activeIdx,
    setActiveIdx,
    closeEvaluation,
    doBuscar,
    onInputKeyDown,
  } = context;
  return <div role="search" aria-label={DESEMPENO.search.label} className="print:hidden">
      {/* Los botones chicos de la fila toman la altura del buscador para alinear. */}
      <div className="flex flex-col gap-2 [--control-height-sm:var(--control-height)] md:flex-row md:items-center">
        {/* Campo de búsqueda */}
        <div className="flex w-full min-w-0 gap-2 md:flex-1">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input ref={inputRef} value={numeroBuscado} enterKeyHint="search" onChange={e => {
              setNumeroBuscado(e.target.value);
              setShowSugg(true);
            }} onFocus={() => setShowSugg(true)} onBlur={() => setShowSugg(false)} onKeyDown={onInputKeyDown} disabled={loading} placeholder={DESEMPENO.search.placeholder} aria-label={DESEMPENO.search.label} aria-describedby={`${searchId}-help`} aria-controls={expanded && !suggestionError ? listId : undefined} aria-activedescendant={expanded && !suggLoading && suggestions[activeIdx] ? `${listId}-${activeIdx}` : undefined} className="pl-9 pr-11" autoComplete="off" role="combobox" aria-expanded={expanded} aria-autocomplete="list" />
            {numeroBuscado && <button type="button" disabled={loading} onClick={() => {
              setNumeroBuscado("");
              setSuggestions([]);
              inputRef.current?.focus();
            }} className="absolute right-0 top-1/2 flex size-(--control-height) -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed rounded-md disabled:opacity-50" aria-label="Limpiar búsqueda">
              <X className="size-4" aria-hidden="true" />
            </button>}

            {showMinLengthHint && <div role="status" className="absolute z-20 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-body-sm text-muted-foreground shadow-[var(--floating-shadow)]">
              {DESEMPENO.search.help}
            </div>}

            {/* Dropdown de sugerencias */}
            {expanded && suggLoading && (
              <div id={listId} role="listbox" aria-label={DESEMPENO.search.label} aria-busy="true" className="absolute z-20 w-full rounded-md border bg-popover p-2 shadow-[var(--floating-shadow)]">
                <span role="status" className="sr-only">Buscando sugerencias de empleados</span>
                <div aria-hidden="true" className="space-y-2">
                  {[0, 1, 2].map(row => (
                    <div key={row} className="flex min-h-(--control-height) items-center gap-2 px-1">
                      <Skeleton className="h-4 w-16 shrink-0" />
                      <Skeleton className="h-4 w-2/5" />
                      <Skeleton className="ml-auto hidden h-4 w-1/4 sm:block" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {expanded && !suggLoading && suggestionError && (
              <div role="alert" className="absolute z-20 w-full rounded-md border bg-popover px-3 py-2 text-body-md text-muted-foreground shadow-[var(--floating-shadow)]">
                No se pudieron cargar las sugerencias. Inténtalo de nuevo.
              </div>
            )}
            {expanded && !suggLoading && !suggestionError && <div id={listId} role="listbox" aria-label={DESEMPENO.search.label} className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-[var(--floating-shadow)]">
              {suggestions.length === 0 ? <div className="px-3 py-2 text-body-md text-muted-foreground">Sin coincidencias</div> : suggestions.map((s, idx) => <button key={s.numero} type="button" id={`${listId}-${idx}`} role="option" tabIndex={-1} aria-selected={idx === activeIdx} onMouseDown={e => e.preventDefault()} onClick={() => {
                setNumeroBuscado(s.numero);
                doBuscar(s.numero);
              }} onMouseEnter={() => setActiveIdx(idx)} className={`flex min-h-(--control-height) w-full items-center gap-2 px-3 py-2 text-left font-sans ${idx === activeIdx ? "bg-accent" : "hover:bg-accent"}`}>
                  <span className="shrink-0 text-body-sm font-normal leading-4 tabular-nums text-muted-foreground">{s.numero}</span>
                  <span className="min-w-0 truncate text-body-md font-medium leading-5 text-foreground">{s.nombre || "—"}</span>
                  {s.puesto && <span className="ml-auto max-w-[40%] truncate text-body-sm font-normal leading-4 text-muted-foreground">{s.puesto}</span>}
                </button>)}
            </div>}
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 md:shrink-0">
        {/* El periodo vigente se asigna al buscar; los históricos se abren desde Historial. */}
        <div className="flex min-h-(--control-height) min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-card px-3 md:max-w-xs md:flex-none" role="status" aria-live="polite">
          <span className="shrink-0 text-body-md text-muted-foreground">Periodo</span>
          {loading
            ? <><span className="sr-only">Consultando periodo de evaluación</span><Skeleton aria-hidden="true" className="h-4 w-32" /></>
            : <span className="min-w-0 truncate text-body-md font-medium text-foreground" title={periodoVisible ?? undefined}>
                {periodoVisible ? `${esPeriodoSemestral(periodoVisible) ? DESEMPENO.modes.semestrales : DESEMPENO.modes.mensuales} · ${periodoVisible}` : "Se asigna automáticamente"}
              </span>}
        </div>
        {actions}
        {(data || existingEvaluation) && <ActionButton icon={<X className="size-4" />} label="Cerrar" tooltip="Cerrar evaluación" onClick={closeEvaluation} variant="outline" className="shrink-0 text-foreground" />}
        </div>
      </div>

      <p id={`${searchId}-help`} className="sr-only">{DESEMPENO.search.help}</p>
  </div>;
}
