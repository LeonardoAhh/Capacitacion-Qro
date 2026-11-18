-- Vincula el plan al catálogo de /plantilla sin perder nombres históricos.
ALTER TABLE public.plan_anual_cursos
  ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

CREATE INDEX plan_anual_cursos_course_id_idx
  ON public.plan_anual_cursos (course_id);

-- Solo enlaza coincidencias exactas ignorando mayúsculas y espacios exteriores.
-- Los demás renglones conservan su nombre hasta que se vinculen manualmente.
UPDATE public.plan_anual_cursos plan
SET course_id = (
  SELECT catalog.id
  FROM public.courses catalog
  WHERE lower(btrim(catalog.name)) = lower(btrim(plan.nombre))
  ORDER BY catalog.id
  LIMIT 1
)
WHERE plan.course_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.courses catalog
    WHERE lower(btrim(catalog.name)) = lower(btrim(plan.nombre))
  );

-- El nombre guardado siempre se toma del catálogo al crear o cambiar el curso.
CREATE OR REPLACE FUNCTION public.plan_anual_sync_course_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text;
BEGIN
  IF NEW.course_id IS NULL THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Selecciona un curso del catálogo'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
    RETURN NEW;
  END IF;

  SELECT name INTO v_name
  FROM public.courses
  WHERE id = NEW.course_id;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'El curso seleccionado ya no existe en el catálogo'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  NEW.nombre := v_name;
  RETURN NEW;
END;
$$;

CREATE TRIGGER plan_anual_sync_course_name_trg
  BEFORE INSERT OR UPDATE OF course_id, nombre
  ON public.plan_anual_cursos
  FOR EACH ROW EXECUTE FUNCTION public.plan_anual_sync_course_name();

-- Los nuevos renglones exigen un curso del catálogo; los históricos siguen editables.
DROP POLICY plan_anual_cursos_insert ON public.plan_anual_cursos;
CREATE POLICY plan_anual_cursos_insert ON public.plan_anual_cursos
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'dev' AND course_id IS NOT NULL);
