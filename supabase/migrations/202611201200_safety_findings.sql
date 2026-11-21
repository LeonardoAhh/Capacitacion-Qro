CREATE TABLE public.safety_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  description text NOT NULL CHECK (length(btrim(description)) > 0),
  department text NOT NULL CHECK (length(btrim(department)) > 0),
  responsible text NOT NULL CHECK (length(btrim(responsible)) > 0),
  status text NOT NULL CHECK (status IN ('Abierto', 'En seguimiento', 'Cerrado')),
  finding_date date NOT NULL,
  evidence_paths text[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX safety_findings_date_idx ON public.safety_findings (finding_date DESC, created_at DESC);

ALTER TABLE public.safety_findings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.safety_findings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.safety_findings TO authenticated;

CREATE POLICY safety_findings_read ON public.safety_findings
  FOR SELECT TO authenticated USING (public.get_my_role() IN ('dev', 'admin'));
CREATE POLICY safety_findings_create ON public.safety_findings
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.get_my_role() = 'dev');

INSERT INTO storage.buckets (id, name, public)
VALUES ('safety-findings', 'safety-findings', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY safety_findings_evidence_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'safety-findings' AND public.get_my_role() IN ('dev', 'admin'));
CREATE POLICY safety_findings_evidence_create ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'safety-findings'
    AND public.get_my_role() = 'dev'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY safety_findings_evidence_remove ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'safety-findings'
    AND public.get_my_role() = 'dev'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
