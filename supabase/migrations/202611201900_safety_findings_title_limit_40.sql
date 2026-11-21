ALTER TABLE public.safety_findings
  ADD CONSTRAINT safety_findings_title_length
  CHECK (char_length(title) <= 40) NOT VALID;
