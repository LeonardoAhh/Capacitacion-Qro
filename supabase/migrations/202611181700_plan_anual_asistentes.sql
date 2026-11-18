-- Asistencia capturada para cada curso impartido del plan anual.
ALTER TABLE public.plan_anual_cursos
  ADD COLUMN IF NOT EXISTS asistentes integer;

ALTER TABLE public.plan_anual_cursos
  ADD CONSTRAINT plan_anual_asistentes_consistentes CHECK (
    asistentes IS NULL OR (impartido AND asistentes >= 0)
  );
