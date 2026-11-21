-- NOT VALID keeps existing long descriptions readable; new writes must respect the limit.
ALTER TABLE public.safety_findings
  ADD CONSTRAINT safety_findings_description_length
  CHECK (char_length(description) <= 180) NOT VALID;
