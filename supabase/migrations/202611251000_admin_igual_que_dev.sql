-- ============================================================
-- Admin con los mismos poderes que dev.
--
--   admin  Antes solo lectura; ahora edita en Capacitación y en Seguridad e
--          Higiene igual que dev, y puede cambiar roles.
--   dev    Conserva todo (más la revisión de ideas de mejora, solo en la app).
--
-- Debe coincidir con lib/constants/roles.ts. Se puede volver a correr.
-- ============================================================

-- ─── 1. Rol efectivo ──────────────────────────────────────────────
-- Las políticas y funciones que comparan get_my_role() con 'dev' cubren a admin
-- desde aquí, igual que al analista, sin reescribirlas.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE role WHEN 'analista' THEN 'dev' WHEN 'admin' THEN 'dev' ELSE role END
  FROM public.profiles
  WHERE user_id = auth.uid();
$$;

-- ─── 2. Cambiar roles: dev y admin ────────────────────────────────
CREATE OR REPLACE FUNCTION public.profiles_guard_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('dev', 'admin')) THEN
    RAISE EXCEPTION 'Only dev or admin can change the role column'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

-- ─── 3. Seguridad e Higiene: dev, admin y ehs ─────────────────────
CREATE OR REPLACE FUNCTION public.puede_gestionar_seguridad()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('dev', 'admin', 'ehs'));
$$;

-- Funciones que leen profiles.role directo con la lista ('dev', 'ehs') o role = 'dev'
-- (búsqueda de empleados para EHS, guardia del puesto): se agrega admin.
DO $$
DECLARE
  fn RECORD;
  definicion TEXT;
  nueva TEXT;
BEGIN
  FOR fn IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND (p.prosrc LIKE '%role IN (''dev'', ''ehs'')%' OR p.prosrc LIKE '%AND role = ''dev'')%')
  LOOP
    definicion := pg_get_functiondef(fn.oid);
    nueva := replace(definicion, 'role IN (''dev'', ''ehs'')', 'role IN (''dev'', ''admin'', ''ehs'')');
    nueva := replace(nueva, 'AND role = ''dev'')', 'AND role IN (''dev'', ''admin''))');
    IF nueva IS DISTINCT FROM definicion THEN
      EXECUTE nueva;
    END IF;
  END LOOP;
END;
$$;

-- ─── 4. Políticas que leen profiles.role directo ──────────────────
-- Tras la migración de roles quedaron como role = ANY (ARRAY['dev', 'analista']);
-- se agrega admin donde aún no está.
DO $$
DECLARE
  pol RECORD;
  patron CONSTANT TEXT := 'ARRAY\[''dev''::text, ''analista''::text\]';
  reemplazo CONSTANT TEXT := 'ARRAY[''dev''::text, ''analista''::text, ''admin''::text]';
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
