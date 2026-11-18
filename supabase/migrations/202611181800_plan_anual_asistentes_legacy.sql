-- La asistencia ahora se obtiene del historial individual de cursos.
-- Conserva los valores anteriores, que ya no se editan ni se usan en métricas.
ALTER TABLE public.plan_anual_cursos
  DROP CONSTRAINT IF EXISTS plan_anual_asistentes_consistentes;
