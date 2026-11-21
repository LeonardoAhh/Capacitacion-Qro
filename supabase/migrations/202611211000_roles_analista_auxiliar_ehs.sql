-- ============================================================
-- Roles nuevos: analista, auxiliar y ehs.
--
--   analista  Igual que dev en Capacitación. Las herramientas privadas de
--             desarrollador dependen de la cuenta, no del rol.
--   auxiliar  Solo /plantilla: consulta empleados y captura Incidencias,
--             Actas administrativas, Incumplimiento y Retardos.
--   ehs       Solo Seguridad e Higiene: crea, edita y borra hallazgos y su
--             evidencia.
--
-- Debe coincidir con lib/constants/roles.ts.
-- ============================================================

-- ─── 1. Valores permitidos ────────────────────────────────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('dev', 'analista', 'admin', 'auxiliar', 'ehs', 'evaluador'));

-- ─── 2. Rol efectivo ──────────────────────────────────────────────
-- Todas las políticas y funciones existentes comparan get_my_role() con 'dev'.
-- El analista hereda esos permisos aquí, en un solo lugar, sin reescribirlas.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE role WHEN 'analista' THEN 'dev' ELSE role END
  FROM public.profiles
  WHERE user_id = auth.uid();
$$;

-- Cambiar roles sigue siendo exclusivo del dev real (no del analista).
-- Sin sesión (SQL editor, service role) se permite, como antes.
CREATE OR REPLACE FUNCTION public.profiles_guard_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'dev') THEN
    RAISE EXCEPTION 'Only dev role can change the role column'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

-- ─── 3. Permisos por área ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.puede_capturar_plantilla()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(public.get_my_role() IN ('dev', 'auxiliar'), false);
$$;

-- Usa el rol real: el analista hereda dev en Capacitación, no Seguridad e Higiene.
CREATE OR REPLACE FUNCTION public.puede_gestionar_seguridad()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('dev', 'ehs'));
$$;

REVOKE ALL ON FUNCTION public.puede_capturar_plantilla() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.puede_gestionar_seguridad() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.puede_capturar_plantilla() TO authenticated;
GRANT EXECUTE ON FUNCTION public.puede_gestionar_seguridad() TO authenticated;

-- ─── 4. Auxiliar: captura individual en la plantilla ──────────────
-- Retardos e incumplimientos se capturan con estas funciones. Se reescribe solo
-- su validación de rol; las importaciones masivas siguen siendo de dev.
DO $$
DECLARE
  fn RECORD;
  definicion TEXT;
  cambiadas INT := 0;
BEGIN
  FOR fn IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('registrar_retardo', 'registrar_incumplimiento_reglamento')
  LOOP
    definicion := pg_get_functiondef(fn.oid);
    IF position('public.get_my_role() IS DISTINCT FROM ''dev''' IN definicion) > 0 THEN
      EXECUTE replace(definicion,
        'public.get_my_role() IS DISTINCT FROM ''dev''',
        'NOT public.puede_capturar_plantilla()');
      cambiadas := cambiadas + 1;
    ELSIF position('public.puede_capturar_plantilla()' IN definicion) > 0 THEN
      cambiadas := cambiadas + 1; -- ya aplicada (la migración se puede volver a correr)
    END IF;
  END LOOP;
  IF cambiadas = 0 THEN
    RAISE EXCEPTION 'No se encontró la validación de rol en las funciones de captura de la plantilla';
  END IF;
END;
$$;

-- Actas administrativas: captura y cambio de estatus. Borrar sigue siendo de dev.
ALTER POLICY "actas_seguimiento_insert" ON public.actas_seguimiento
  WITH CHECK (public.get_my_role() IN ('dev', 'admin', 'auxiliar'));
ALTER POLICY "actas_seguimiento_update" ON public.actas_seguimiento
  USING (public.get_my_role() IN ('dev', 'admin', 'auxiliar'));

-- ─── 5. EHS: Seguridad e Higiene ──────────────────────────────────
-- Solo quienes tienen ese espacio de trabajo (dev y ehs) leen y gestionan hallazgos.
ALTER POLICY safety_findings_read ON public.safety_findings
  USING (public.puede_gestionar_seguridad());
ALTER POLICY safety_findings_create ON public.safety_findings
  WITH CHECK (created_by = auth.uid() AND public.puede_gestionar_seguridad());
ALTER POLICY safety_findings_update ON public.safety_findings
  USING (public.puede_gestionar_seguridad())
  WITH CHECK (public.puede_gestionar_seguridad());
ALTER POLICY safety_findings_delete ON public.safety_findings
  USING (public.puede_gestionar_seguridad());

ALTER POLICY safety_findings_evidence_read ON storage.objects
  USING (bucket_id = 'safety-findings' AND public.puede_gestionar_seguridad());
ALTER POLICY safety_findings_evidence_create ON storage.objects
  WITH CHECK (
    bucket_id = 'safety-findings'
    AND public.puede_gestionar_seguridad()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
ALTER POLICY safety_findings_evidence_remove ON storage.objects
  USING (bucket_id = 'safety-findings' AND public.puede_gestionar_seguridad());

-- ─── 6. Lugares que leen profiles.role directo ─────────────────────
-- Miembros del Kanban (funciones) y políticas que comparan profiles.role con
-- 'dev' sin pasar por get_my_role(): el analista se agrega junto a dev.
DO $$
DECLARE
  fn RECORD;
  definicion TEXT;
BEGIN
  FOR fn IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prosrc LIKE '%role IN (''dev'', ''admin'')%'
  LOOP
    definicion := pg_get_functiondef(fn.oid);
    EXECUTE replace(definicion, 'role IN (''dev'', ''admin'')', 'role IN (''dev'', ''analista'', ''admin'')');
  END LOOP;
END;
$$;

DO $$
DECLARE
  pol RECORD;
  patron CONSTANT TEXT := '(\m[a-z_]+\.)?role = ''dev''::text';
  reemplazo CONSTANT TEXT := '\1role = ANY (ARRAY[''dev''::text, ''analista''::text])';
  sentencia TEXT;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
      AND (qual ~ patron OR with_check ~ patron)
  LOOP
    sentencia := format('ALTER POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    IF pol.qual IS NOT NULL THEN
      sentencia := sentencia || format(' USING (%s)', regexp_replace(pol.qual, patron, reemplazo, 'g'));
    END IF;
    IF pol.with_check IS NOT NULL THEN
      sentencia := sentencia || format(' WITH CHECK (%s)', regexp_replace(pol.with_check, patron, reemplazo, 'g'));
    END IF;
    EXECUTE sentencia;
  END LOOP;
END;
$$;
