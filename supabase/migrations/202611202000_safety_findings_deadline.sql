ALTER TABLE public.safety_findings
  ADD COLUMN deadline text
  CHECK (deadline IN ('Corrección Inmediata', '1 semana', '15 días'));
