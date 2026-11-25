-- Ideas de mejora del sistema. Cualquier usuario con sesión envía; solo el rol dev real
-- (no admin ni analista, que heredan 'dev' en get_my_role()) lee la lista y cambia el estado.
CREATE TABLE IF NOT EXISTS public.improvement_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea text NOT NULL CHECK (length(btrim(idea)) BETWEEN 1 AND 500),
  section text NOT NULL CHECK (length(btrim(section)) BETWEEN 1 AND 120),
  status text NOT NULL DEFAULT 'nueva' CHECK (status IN ('nueva', 'en_revision', 'hecha')),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  -- Nombre de quien la propuso al enviarla: lo pone el trigger, no el cliente.
  author_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS improvement_ideas_created_idx ON public.improvement_ideas (created_at DESC);

-- Solo lee el perfil real (no get_my_role(), que convierte admin y analista en dev).
CREATE OR REPLACE FUNCTION public.puede_revisar_ideas()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'dev');
$$;

REVOKE ALL ON FUNCTION public.puede_revisar_ideas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.puede_revisar_ideas() TO authenticated;

CREATE OR REPLACE FUNCTION public.improvement_ideas_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
    NEW.status := 'nueva';
    SELECT coalesce(nullif(btrim(p.display_name), ''), split_part(u.email, '@', 1), 'Usuario')
      INTO NEW.author_name
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE u.id = auth.uid()
    LIMIT 1;
    NEW.author_name := coalesce(NEW.author_name, 'Usuario');
  END IF;
  NEW.idea := btrim(NEW.idea);
  NEW.section := btrim(NEW.section);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.improvement_ideas_before_write() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS improvement_ideas_before_write ON public.improvement_ideas;
CREATE TRIGGER improvement_ideas_before_write
  BEFORE INSERT OR UPDATE ON public.improvement_ideas
  FOR EACH ROW EXECUTE FUNCTION public.improvement_ideas_before_write();

ALTER TABLE public.improvement_ideas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.improvement_ideas FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.improvement_ideas TO authenticated;
GRANT INSERT (idea, section) ON public.improvement_ideas TO authenticated;
-- Revisar = cambiar el estado; el texto de la idea no se edita.
GRANT UPDATE (status) ON public.improvement_ideas TO authenticated;

DROP POLICY IF EXISTS improvement_ideas_read ON public.improvement_ideas;
DROP POLICY IF EXISTS improvement_ideas_create ON public.improvement_ideas;
DROP POLICY IF EXISTS improvement_ideas_review ON public.improvement_ideas;

CREATE POLICY improvement_ideas_read ON public.improvement_ideas
  FOR SELECT TO authenticated USING (public.puede_revisar_ideas());
CREATE POLICY improvement_ideas_create ON public.improvement_ideas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY improvement_ideas_review ON public.improvement_ideas
  FOR UPDATE TO authenticated
  USING (public.puede_revisar_ideas())
  WITH CHECK (public.puede_revisar_ideas());
