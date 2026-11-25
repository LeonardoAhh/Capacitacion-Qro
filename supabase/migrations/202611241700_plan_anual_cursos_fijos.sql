-- Cursos fijos del plan anual: se programan todos los meses y se listan primero.
-- La lista la define Capacitación desde Plan anual → Cursos fijos.
BEGIN;

CREATE TABLE IF NOT EXISTS public.plan_anual_cursos_fijos (
  course_id uuid PRIMARY KEY REFERENCES public.courses(id) ON DELETE CASCADE,
  orden integer NOT NULL DEFAULT 0 CHECK (orden >= 0),
  area_solicitante text NOT NULL CHECK (length(btrim(area_solicitante)) > 0),
  aplica_para text NOT NULL CHECK (length(btrim(aplica_para)) > 0),
  tipo text NOT NULL CHECK (tipo IN ('interno', 'externo')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_anual_cursos_fijos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.plan_anual_cursos_fijos FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_anual_cursos_fijos TO authenticated;

CREATE POLICY plan_anual_cursos_fijos_select ON public.plan_anual_cursos_fijos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY plan_anual_cursos_fijos_insert ON public.plan_anual_cursos_fijos
  FOR INSERT TO authenticated WITH CHECK (public.get_my_role() = 'dev');
CREATE POLICY plan_anual_cursos_fijos_update ON public.plan_anual_cursos_fijos
  FOR UPDATE TO authenticated USING (public.get_my_role() = 'dev')
  WITH CHECK (public.get_my_role() = 'dev');
CREATE POLICY plan_anual_cursos_fijos_delete ON public.plan_anual_cursos_fijos
  FOR DELETE TO authenticated USING (public.get_my_role() = 'dev');

COMMIT;

-- Un curso del catálogo solo una vez por mes. Si ya hay repetidos, el índice no se crea
-- (se avisa con NOTICE) y la app sigue evitando nuevos duplicados.
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS plan_anual_cursos_mes_curso_unico
    ON public.plan_anual_cursos (anio, mes, course_id)
    WHERE course_id IS NOT NULL;
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'Hay cursos repetidos en algún mes del plan anual; elimina los duplicados y vuelve a correr este bloque.';
END $$;
