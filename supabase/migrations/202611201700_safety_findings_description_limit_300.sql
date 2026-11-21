ALTER TABLE public.safety_findings
  DROP CONSTRAINT IF EXISTS safety_findings_description_length;

ALTER TABLE public.safety_findings
  ADD CONSTRAINT safety_findings_description_length
  CHECK (char_length(description) <= 300) NOT VALID;
