"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EvaluationWorkspace } from "./desempeno/workspace";
import { useEvaluationSearch } from "./desempeno/use-evaluation-search";
import { SearchPanel } from "./desempeno/search-panel";
import { PendingSummary } from "./desempeno/pending-summary";
import { ExistingEvaluationNotice } from "./desempeno/existing-evaluation-notice";
import { Suspense, useEffect } from "react";
import { ClipboardClock, X } from "lucide-react";
import { notify } from "@/lib/notify";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UMBRAL_CALIFICACION_APROBATORIA } from "@/lib/types/desempeno";
import DesempenoPrint from "./desempeno-print";
import { DesempenoForm } from "./desempeno-form-operativo";
import { DesempenoSaveSuccess } from "./desempeno-save-success";
import { DesempenoGuia } from "./desempeno-guia";
import { ActionButton, GuiaButton } from "./desempeno/search-controls";
import { useRole } from "@/lib/hooks/useRole";
import { useUser } from "@/lib/hooks/useUser";
import { DESEMPENO } from "@/lib/desempeno/presentation";
import { Skeleton } from "@/components/ui/skeleton";

function EvaluationLoadingSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <span className="sr-only">Cargando evaluación del empleado</span>
      <div aria-hidden="true" className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-(--control-height) w-24" />
          <Skeleton className="h-(--control-height) w-28" />
          <Skeleton className="h-(--control-height) w-24" />
        </div>
        <div className="rounded-xl border bg-card p-4 sm:p-(--card-padding)">
          <div className="space-y-3">
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-3/4 max-w-xl" />
            <Skeleton className="h-6 w-2/3 max-w-md" />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map(item => (
              <div key={item} className="space-y-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map(item => (
            <Skeleton key={item} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Un solo toast para el resultado de la búsqueda; una búsqueda nueva lo reemplaza.
const SEARCH_ERROR_TOAST_ID = "evaluation-search-error";
const REGULARIZATION_TITLE = "Regularización requerida";

function DesempenoSearchContent() {
  const router = useRouter();
  const { supervisesEvaluations, loading: roleLoading } = useRole();
  const { user } = useUser();
  const context = useEvaluationSearch();
  const {
    data,
    setData,
    existingEvaluation,
    loading,
    saving,
    saveSuccess,
    resetSaveSuccess,
    error,
    guardar,
    guiaOpen,
    setGuiaOpen,
    practiceLocked,
    ponderacion,
    bloqueado,
    faltaEvaluador
  } = context;
  // Los errores de búsqueda se comunican con toast (sin banner en la página).
  useEffect(() => {
    if (!error) {
      notify.dismiss(SEARCH_ERROR_TOAST_ID);
      return;
    }
    if (roleLoading) return;
    const needsRegularization = error.title === REGULARIZATION_TITLE;
    notify.error(error.title, {
      id: SEARCH_ERROR_TOAST_ID,
      description: needsRegularization && !supervisesEvaluations
        ? `${error.description} Acude a Recursos Humanos.`
        : error.description,
      // Con acción, el toast permanece hasta que se use o se cierre.
      ...(needsRegularization && supervisesEvaluations ? {
        duration: Infinity,
        action: { label: "Regularizar →", onClick: () => router.push(DESEMPENO.routes.late) },
      } : {}),
    });
  }, [error, supervisesEvaluations, roleLoading, router]);

  useEffect(() => () => { notify.dismiss(SEARCH_ERROR_TOAST_ID); }, []);

  return <TooltipProvider>
    <div inert={practiceLocked}>
    <EvaluationWorkspace
      section="evaluation"
      confirmNavigation={context.confirmDiscard}
      actions={<>
        {context.modoEdicion && data && <Button type="button" variant="outline" size="sm" disabled className="px-3">Editando</Button>}
        {!roleLoading && user && supervisesEvaluations && <Button asChild variant="outline" size="sm" className="px-3">
          <Link href={DESEMPENO.routes.late} onNavigate={event => {
            event.preventDefault();
            void context.confirmDiscard().then(confirmed => {
              if (confirmed) router.push(DESEMPENO.routes.late);
            });
          }} aria-label="Regularizar evaluaciones vencidas"><ClipboardClock className="hidden sm:block" aria-hidden="true" /><span className="sm:hidden">Regularizar</span><span className="hidden sm:inline">Vencidas</span></Link>
        </Button>}
        <GuiaButton onClick={() => setGuiaOpen(true)} />
        {data && <ActionButton icon={<X />} label="Cerrar" tooltip="Cerrar evaluación" onClick={context.closeEvaluation} variant="outline" />}
      </>}
    >

      {/* ── Buscador: oculto mientras se evalúa; Cerrar vive en las acciones ── */}
      {!data && <SearchPanel context={context} />}

      {/* Banner de Pendientes en estado vacío */}
      <PendingSummary context={context} />

      {loading && <EvaluationLoadingSkeleton />}


      {existingEvaluation && !loading && <ExistingEvaluationNotice evaluation={existingEvaluation} />}

      {!loading && data ? <div className={saveSuccess ? "hidden" : undefined}><DesempenoForm data={data} onUpdate={next => {
        resetSaveSuccess();
        setData(next);
      }} onGuardar={() => guardar(data)} saving={saving} guardarDisabled={saving || saveSuccess || bloqueado || faltaEvaluador} guardarTooltip={faltaEvaluador ? "Selecciona al evaluador antes de guardar." : bloqueado ? `Captura los compromisos antes de guardar una evaluación menor a ${UMBRAL_CALIFICACION_APROBATORIA}%.` : undefined} /></div> : null}

      {data && saveSuccess && !loading && <div className="print-area hidden print:block">
        <DesempenoPrint data={data} />
    </div>}

      <DesempenoSaveSuccess visible={saveSuccess} nombre={data?.nombre} calificacion={ponderacion?.calificacionFinal} onPrint={() => window.print()} onNew={() => {
        context.closeEvaluation();
      }} onEdit={context.canEdit ? resetSaveSuccess : undefined} />

  </EvaluationWorkspace>
    </div>
    <DesempenoGuia open={guiaOpen} onClose={() => setGuiaOpen(false)} />
</TooltipProvider>;
}

// ─── Export con Suspense boundary ─────────────────────────────────────────────

export default function DesempenoSearch() {
  return <Suspense fallback={<EvaluationLoadingSkeleton />}>
    <DesempenoSearchContent />
</Suspense>;
}
