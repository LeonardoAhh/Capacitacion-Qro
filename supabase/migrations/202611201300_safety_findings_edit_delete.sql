GRANT UPDATE, DELETE ON public.safety_findings TO authenticated;

CREATE POLICY safety_findings_update ON public.safety_findings
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'dev')
  WITH CHECK (public.get_my_role() = 'dev');

CREATE POLICY safety_findings_delete ON public.safety_findings
  FOR DELETE TO authenticated USING (public.get_my_role() = 'dev');

DROP POLICY safety_findings_evidence_remove ON storage.objects;
CREATE POLICY safety_findings_evidence_remove ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'safety-findings' AND public.get_my_role() = 'dev');
