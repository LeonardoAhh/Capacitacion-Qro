ALTER TABLE public.safety_findings
  ADD COLUMN completion_evidence_paths text[] NOT NULL DEFAULT '{}';
