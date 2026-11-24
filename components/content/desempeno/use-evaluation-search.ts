"use client";

import { SEARCH_OPTIONS } from "@/lib/desempeno/presentation";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDesempeno } from "@/lib/hooks/useDesempeno";
import { EVALUADORES_PUESTO, normalizarPeriodoDesempeno } from "@/lib/catalogo";
import { getGruposEvaluadores } from "@/lib/desempeno/evaluadores";
import { clearDraft, readDraft, readLastEvaluator, writeDraft, writeLastEvaluator, type EvaluationDraft } from "@/lib/desempeno/captura-local";
import { UMBRAL_CALIFICACION_APROBATORIA, calcularPonderacion, type DesempenoData } from "@/lib/types/desempeno";
import { useRole, useUser } from "@/lib/hooks";
import { usePendingEvals } from "@/lib/hooks/usePendingEvals";
import { confirm } from "@/components/ui/confirm-dialog";
import { registerUnsavedChangesGuard } from "@/lib/unsaved-changes";
/** Espera antes de guardar el borrador local, para no escribir en cada tecla. */
const DRAFT_SAVE_DELAY_MS = 600;

/** Último evaluador usado por la cuenta, si también es válido para esta persona. */
function rememberedEvaluator(userId: string | undefined, data: DesempenoData): string | null {
  if (!userId || data.evaluador_nombre) return null;
  const nombre = readLastEvaluator(userId);
  if (!nombre) return null;
  const grupos = getGruposEvaluadores({ puesto: data.puesto, evaluado: data.nombre });
  return grupos.some(({ evaluadores }) => evaluadores.includes(nombre)) ? nombre : null;
}

export function useEvaluationSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [numeroBuscado, setNumeroBuscado] = useState("");
  const {
    data,
    setData,
    existingEvaluation,
    clearEvaluation,
    origen,
    loading,
    saving,
    saveSuccess,
    resetSaveSuccess,
    error,
    buscarEmpleado,
    buscarSugerencias,
    guardar,
    cargarEvaluacion
  } = useDesempeno();
  const {
    isEvaluador,
    canEdit,
  } = useRole();
  const { user } = useUser();
  const userId = user?.id;
  // Borrador local de esta persona y periodo, ofrecido al cargarla.
  const [pendingDraft, setPendingDraft] = useState<EvaluationDraft | null>(null);
  const {
    loading: pendingLoading,
    deptGroups,
    totalEvals,
    totalVencidas,
    totalProximas,
    totalATiempo
  } = usePendingEvals();
  // La práctica se abre a petición (botón Guía o aviso de práctica); nunca bloquea la página.
  const [guiaOpen, setGuiaOpen] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const handledEvalIdRef = useRef<string | null>(null);
  const handledQueryRef = useRef<string | null>(null);

  // Typeahead
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<Array<{
    numero: string;
    nombre: string;
    puesto: string;
  }>>([]);
  const [suggLoading, setSuggLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState(false);
  const [showSugg, setShowSugg] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  // Gate de impresión: solo se puede imprimir una evaluación ya guardada y sin ediciones posteriores.
  const savedSnapshotRef = useRef<string | null>(null);
  const baselineSnapshotRef = useRef<string | null>(null);
  const baselineKeyRef = useRef<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  // Cargar evaluación desde URL si existe evalId
  useEffect(() => {
    const evalId = searchParams.get('evalId');
    if (!evalId) { handledEvalIdRef.current = null; return; }
    if (handledEvalIdRef.current === evalId) return;
    handledEvalIdRef.current = evalId;
    if (isEvaluador) {
      router.replace('/desempeno', { scroll: false });
      return;
    }
    if (cargarEvaluacion) {
      // Legacy URL-driven flow: the editing flag must flip before the async
      // load resolves. Suppressed until this effect is refactored to a
      // render-derived state machine.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModoEdicion(true);
      cargarEvaluacion(evalId).then(() => {
        // Limpiar URL después de cargar
        router.replace('/desempeno', {
          scroll: false
        });
      });
    }
  }, [searchParams, cargarEvaluacion, isEvaluador, router]);
  // Atajo "/" para enfocar el buscador.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounce de sugerencias (≥2 caracteres).
  useEffect(() => {
    let cancelled = false;
    const term = numeroBuscado.trim();
    if (term.length < SEARCH_OPTIONS.minLength) {
      setSuggestions([]);
      setSuggLoading(false);
      setSuggestionError(false);
      return;
    }
    setSuggLoading(true);
    setSuggestionError(false);
    setSuggestions([]);
    setActiveIdx(-1);
    const t = setTimeout(async () => {
      try {
        const res = await buscarSugerencias(term);
        if (cancelled) return;
        setSuggestions(res);
        setActiveIdx(-1);
      } catch (error) {
        if (cancelled) return;
        console.error("useEvaluationSearch suggestions:", error);
        setSuggestions([]);
        setSuggestionError(true);
      } finally {
        if (!cancelled) setSuggLoading(false);
      }
    }, SEARCH_OPTIONS.debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [numeroBuscado, buscarSugerencias]);
  const doBuscar = useCallback(async (valor: string) => {
    const v = valor.trim();
    if (!v) return;
    setShowSugg(false);
    setActiveIdx(-1);
    setModoEdicion(false); // Salir del modo edición al buscar nuevo empleado
    resetSaveSuccess();
    await buscarEmpleado(v);
  }, [buscarEmpleado, resetSaveSuccess]);

  const identityKey = data ? `${data.numero_empleado}:${normalizarPeriodoDesempeno(data.periodo)}` : null;
  useEffect(() => {
    if (!data || !identityKey) {
      baselineKeyRef.current = null;
      baselineSnapshotRef.current = null;
      return;
    }
    if (loading) return;
    if (baselineKeyRef.current !== identityKey) {
      // El evaluador de la última evaluación guardada se propone antes de fijar la línea base,
      // así no cuenta como cambio sin guardar.
      const evaluador = rememberedEvaluator(userId, data);
      if (evaluador) {
        setData({ ...data, evaluador_nombre: evaluador, evaluador_puesto: EVALUADORES_PUESTO[evaluador] ?? "" });
        return;
      }
      baselineKeyRef.current = identityKey;
      baselineSnapshotRef.current = JSON.stringify(data);
      const draft = userId ? readDraft(userId, identityKey) : null;
      setPendingDraft(draft && JSON.stringify(draft.data) !== baselineSnapshotRef.current ? draft : null);
    }
  }, [data, identityKey, loading, setData, userId]);
  const hasUnsavedChanges = Boolean(!loading && !saveSuccess && data && baselineSnapshotRef.current && JSON.stringify(data) !== baselineSnapshotRef.current && !guardado);

  // Guarda la captura en este navegador mientras se edita: si se interrumpe, se retoma.
  useEffect(() => {
    if (!hasUnsavedChanges || !data || !identityKey || !userId) return;
    const timer = window.setTimeout(() => writeDraft(userId, identityKey, data), DRAFT_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [data, hasUnsavedChanges, identityKey, userId]);

  const restoreDraft = useCallback(() => {
    if (pendingDraft) setData(pendingDraft.data);
    setPendingDraft(null);
  }, [pendingDraft, setData]);

  const discardDraft = useCallback(() => {
    if (userId && identityKey) clearDraft(userId, identityKey);
    setPendingDraft(null);
  }, [identityKey, userId]);

  /** Tras confirmar que se descarta la captura, también se borra su borrador. */
  const confirmAndForget = useCallback(async (ask: () => Promise<boolean>) => {
    const hadChanges = hasUnsavedChanges;
    const confirmed = await ask();
    if (confirmed && hadChanges && userId && identityKey) clearDraft(userId, identityKey);
    return confirmed;
  }, [hasUnsavedChanges, identityKey, userId]);

  const confirmDiscard = useCallback(async () => {
    if (!hasUnsavedChanges) return true;
    return confirm({
      title: "Cambios sin guardar",
      description: "Si continúas, se perderá la captura que todavía no has guardado.",
      confirmLabel: "Descartar cambios",
      cancelLabel: "Seguir capturando",
      tone: "destructive",
      appearance: "minimal",
    });
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    return registerUnsavedChangesGuard(confirmDiscard);
  }, [confirmDiscard, hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.origin !== window.location.origin || anchor.href === window.location.href) return;
      event.preventDefault();
      void confirmDiscard().then(confirmed => {
        if (confirmed) router.push(`${anchor.pathname}${anchor.search}${anchor.hash}`);
      });
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onDocumentClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [confirmDiscard, hasUnsavedChanges, router]);

  const closeEvaluation = useCallback(async () => {
    if (!(await confirmAndForget(confirmDiscard))) return;
    setPendingDraft(null);
    clearEvaluation();
    setModoEdicion(false);
    setNumeroBuscado("");
    // El buscador reaparece al cerrar; devuelve ahí el foco.
    requestAnimationFrame(() => inputRef.current?.focus());
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete("q");
    newParams.delete("evalId");
    router.replace(newParams.size ? `/desempeno?${newParams.toString()}` : "/desempeno", { scroll: false });
  }, [confirmAndForget, confirmDiscard, router, searchParams, clearEvaluation]);

  const guardedSearch = useCallback(async (valor: string) => {
    if (!(await confirmAndForget(confirmDiscard))) return;
    setPendingDraft(null);
    await doBuscar(valor);
  }, [confirmAndForget, confirmDiscard, doBuscar]);

  // Realizar búsqueda inicial si existe el parámetro 'q'
  useEffect(() => {
    const q = searchParams.get('q');
    if (!q) { handledQueryRef.current = null; return; }
    if (searchParams.has('evalId') || handledQueryRef.current === q) return;
    handledQueryRef.current = q;
    if (q) {
      setNumeroBuscado(q);
      doBuscar(q);
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('q');
      router.replace(newParams.size ? `/desempeno?${newParams.toString()}` : "/desempeno", {
        scroll: false
      });
    }
  }, [searchParams, router, doBuscar]);
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowSugg(true);
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const s = showSugg && !suggLoading && activeIdx >= 0 ? suggestions[activeIdx] : undefined;
      if (s) {
        setNumeroBuscado(s.numero);
        guardedSearch(s.numero);
      } else {
        guardedSearch(numeroBuscado);
      }
    } else if (e.key === "Escape") {
      setShowSugg(false);
      setActiveIdx(-1);
    }
  };

  // Se "ensucia" al editar o cargar otro empleado → deshabilita imprimir.
  useEffect(() => {
    if (!data) {
      savedSnapshotRef.current = null;
      setGuardado(false);
      return;
    }
    setGuardado(savedSnapshotRef.current === JSON.stringify(data));
  }, [data]);

  // Tras guardar con éxito, fija el snapshot como "limpio", borra el borrador local y
  // recuerda al evaluador para proponerlo en la siguiente evaluación.
  useEffect(() => {
    if (saveSuccess && data) {
      savedSnapshotRef.current = JSON.stringify(data);
      baselineSnapshotRef.current = JSON.stringify(data);
      setGuardado(true);
      setPendingDraft(null);
      if (userId && identityKey) clearDraft(userId, identityKey);
      if (userId && data.evaluador_nombre) writeLastEvaluator(userId, data.evaluador_nombre);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveSuccess]);
  const ponderacion = data ? calcularPonderacion(data) : null;
  const requiereCompromisos = ponderacion !== null && ponderacion.calificacionFinal < UMBRAL_CALIFICACION_APROBATORIA;
  const tieneCompromisos = !!data?.compromisos?.trim();
  const bloqueado = requiereCompromisos && !tieneCompromisos;
  const faltaEvaluador = data ? !data.evaluador_nombre : false;

  const periodoVisible = data?.periodo ?? existingEvaluation?.periodo ?? null;
  return {
    searchParams,
    router,
    numeroBuscado,
    setNumeroBuscado,
    periodoVisible,
    data,
    setData,
    existingEvaluation,
    loading,
    saving,
    saveSuccess,
    resetSaveSuccess,
    error,
    buscarEmpleado,
    buscarSugerencias,
    guardar,
    cargarEvaluacion,
    isEvaluador,
    canEdit,
    deptGroups,
    pendingLoading,
    totalEvals,
    totalVencidas,
    totalProximas,
    totalATiempo,
    guiaOpen,
    setGuiaOpen,
    modoEdicion,
    setModoEdicion,
    inputRef,
    suggestions,
    setSuggestions,
    suggLoading,
    suggestionError,
    setSuggLoading,
    showSugg,
    setShowSugg,
    activeIdx,
    setActiveIdx,
    savedSnapshotRef,
    guardado,
    setGuardado,
    hasUnsavedChanges,
    pendingDraft,
    restoreDraft,
    discardDraft,
    confirmDiscard,
    closeEvaluation,
    doBuscar: guardedSearch,
    onInputKeyDown,
    ponderacion,
    requiereCompromisos,
    tieneCompromisos,
    bloqueado,
    faltaEvaluador,
  };
}
export type EvaluationSearchContext = ReturnType<typeof useEvaluationSearch>;
