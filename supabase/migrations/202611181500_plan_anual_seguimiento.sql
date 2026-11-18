-- Seguimiento de cada curso sin alterar los datos del plan original.
ALTER TABLE public.plan_anual_cursos
  ADD COLUMN IF NOT EXISTS fecha_programada date,
  ADD COLUMN IF NOT EXISTS reprogramado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_reprogramada date,
  ADD COLUMN IF NOT EXISTS motivo_reprogramacion text,
  ADD COLUMN IF NOT EXISTS impartido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_impartido date;

ALTER TABLE public.plan_anual_cursos
  ADD CONSTRAINT plan_anual_reprogramacion_consistente CHECK (
    (reprogramado AND motivo_reprogramacion IS NOT NULL AND btrim(motivo_reprogramacion) <> '')
    OR (NOT reprogramado AND fecha_reprogramada IS NULL AND motivo_reprogramacion IS NULL)
  ),
  ADD CONSTRAINT plan_anual_imparticion_consistente CHECK (
    (impartido AND fecha_impartido IS NOT NULL)
    OR (NOT impartido AND fecha_impartido IS NULL)
  );
