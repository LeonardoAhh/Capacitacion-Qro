-- Un curso del plan puede impartirse varias veces; el mes del plan es su periodo programado.
ALTER TABLE public.plan_anual_cursos
  ADD COLUMN IF NOT EXISTS fechas_imparticion date[] NOT NULL DEFAULT '{}';

-- Conserva la fecha capturada antes de permitir varias sesiones.
UPDATE public.plan_anual_cursos
SET fechas_imparticion = ARRAY[fecha_impartido]
WHERE fecha_impartido IS NOT NULL
  AND cardinality(fechas_imparticion) = 0;

ALTER TABLE public.plan_anual_cursos
  DROP CONSTRAINT IF EXISTS plan_anual_fechas_imparticion_consistentes;

ALTER TABLE public.plan_anual_cursos
  ADD CONSTRAINT plan_anual_fechas_imparticion_consistentes CHECK (
    (impartido AND cardinality(fechas_imparticion) > 0)
    OR (NOT impartido AND cardinality(fechas_imparticion) = 0)
  );
