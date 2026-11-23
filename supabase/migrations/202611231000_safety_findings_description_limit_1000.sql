-- Descripción de hallazgos: hasta 1000 caracteres (antes 500).
-- Debe coincidir con MAX_FINDING_DESCRIPTION_LENGTH (components/content/safety-home/finding-constraints.ts).
ALTER TABLE public.safety_findings
  DROP CONSTRAINT IF EXISTS safety_findings_description_length;

ALTER TABLE public.safety_findings
  ADD CONSTRAINT safety_findings_description_length
  CHECK (char_length(description) <= 1000);
