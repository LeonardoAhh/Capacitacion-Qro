-- DNC: un reporte por departamento y año, con necesidades independientes.
CREATE TABLE public.dnc_reportes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anio smallint NOT NULL CHECK (anio BETWEEN 2000 AND 2100),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  responsable_nombre text,
  responsable_firma text,
  fecha_elaboracion date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (anio, department_id)
);

CREATE TABLE public.dnc_necesidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporte_id uuid NOT NULL REFERENCES public.dnc_reportes(id) ON DELETE CASCADE,
  orden integer NOT NULL DEFAULT 0 CHECK (orden >= 0),
  necesidad text NOT NULL CHECK (length(btrim(necesidad)) > 0),
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  curso_nombre text NOT NULL CHECK (length(btrim(curso_nombre)) > 0),
  funcion_actividad text NOT NULL CHECK (length(btrim(funcion_actividad)) > 0),
  motivo text NOT NULL CHECK (length(btrim(motivo)) > 0),
  beneficio text NOT NULL CHECK (length(btrim(beneficio)) > 0),
  mes_sugerido smallint NOT NULL CHECK (mes_sugerido BETWEEN 1 AND 12),
  tipo text NOT NULL CHECK (tipo IN ('interno', 'externo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.dnc_necesidad_puestos (
  necesidad_id uuid NOT NULL REFERENCES public.dnc_necesidades(id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES public.positions(id) ON DELETE RESTRICT,
  PRIMARY KEY (necesidad_id, position_id)
);

CREATE INDEX dnc_necesidades_reporte_orden_idx ON public.dnc_necesidades (reporte_id, orden, created_at);
CREATE INDEX dnc_necesidad_puestos_position_idx ON public.dnc_necesidad_puestos (position_id);

ALTER TABLE public.dnc_reportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dnc_necesidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dnc_necesidad_puestos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.dnc_reportes, public.dnc_necesidades, public.dnc_necesidad_puestos FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dnc_reportes, public.dnc_necesidades, public.dnc_necesidad_puestos TO authenticated;

CREATE POLICY dnc_reportes_select ON public.dnc_reportes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY dnc_reportes_insert ON public.dnc_reportes
  FOR INSERT TO authenticated WITH CHECK (public.get_my_role() = 'dev');
CREATE POLICY dnc_reportes_update ON public.dnc_reportes
  FOR UPDATE TO authenticated USING (public.get_my_role() = 'dev')
  WITH CHECK (public.get_my_role() = 'dev');
CREATE POLICY dnc_reportes_delete ON public.dnc_reportes
  FOR DELETE TO authenticated USING (public.get_my_role() = 'dev');

CREATE POLICY dnc_necesidades_select ON public.dnc_necesidades
  FOR SELECT TO authenticated USING (true);
CREATE POLICY dnc_necesidades_insert ON public.dnc_necesidades
  FOR INSERT TO authenticated WITH CHECK (
    public.get_my_role() = 'dev'
    AND EXISTS (SELECT 1 FROM public.dnc_reportes WHERE id = reporte_id)
  );
CREATE POLICY dnc_necesidades_update ON public.dnc_necesidades
  FOR UPDATE TO authenticated USING (public.get_my_role() = 'dev')
  WITH CHECK (public.get_my_role() = 'dev');
CREATE POLICY dnc_necesidades_delete ON public.dnc_necesidades
  FOR DELETE TO authenticated USING (public.get_my_role() = 'dev');

CREATE POLICY dnc_necesidad_puestos_select ON public.dnc_necesidad_puestos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY dnc_necesidad_puestos_insert ON public.dnc_necesidad_puestos
  FOR INSERT TO authenticated WITH CHECK (public.get_my_role() = 'dev');
CREATE POLICY dnc_necesidad_puestos_delete ON public.dnc_necesidad_puestos
  FOR DELETE TO authenticated USING (public.get_my_role() = 'dev');

CREATE OR REPLACE FUNCTION public.dnc_guardar_necesidad(
  p_id uuid,
  p_reporte_id uuid,
  p_course_id uuid,
  p_position_ids uuid[],
  p_necesidad text,
  p_funcion_actividad text,
  p_motivo text,
  p_beneficio text,
  p_mes_sugerido smallint,
  p_tipo text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_department_id uuid;
  v_course_name text;
  v_id uuid;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'dev' THEN
    RAISE EXCEPTION 'No tienes permiso para modificar el DNC';
  END IF;

  SELECT department_id INTO v_department_id FROM public.dnc_reportes WHERE id = p_reporte_id;
  IF v_department_id IS NULL THEN
    RAISE EXCEPTION 'El reporte DNC no existe';
  END IF;
  SELECT name INTO v_course_name FROM public.courses WHERE id = p_course_id;
  IF v_course_name IS NULL THEN
    RAISE EXCEPTION 'Selecciona un curso del catálogo';
  END IF;
  IF p_position_ids IS NULL OR cardinality(p_position_ids) = 0 OR EXISTS (
    SELECT 1 FROM unnest(p_position_ids) AS selected(id)
    LEFT JOIN public.positions pos ON pos.id = selected.id
    WHERE pos.id IS NULL OR pos.department_id <> v_department_id
  ) THEN
    RAISE EXCEPTION 'Selecciona puestos válidos del departamento';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.dnc_necesidades (
      reporte_id, orden, course_id, curso_nombre, necesidad, funcion_actividad,
      motivo, beneficio, mes_sugerido, tipo
    ) VALUES (
      p_reporte_id,
      COALESCE((SELECT max(orden) FROM public.dnc_necesidades WHERE reporte_id = p_reporte_id), 0) + 1,
      p_course_id, v_course_name, btrim(p_necesidad), btrim(p_funcion_actividad),
      btrim(p_motivo), btrim(p_beneficio), p_mes_sugerido, p_tipo
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.dnc_necesidades SET
      course_id = p_course_id,
      curso_nombre = v_course_name,
      necesidad = btrim(p_necesidad),
      funcion_actividad = btrim(p_funcion_actividad),
      motivo = btrim(p_motivo),
      beneficio = btrim(p_beneficio),
      mes_sugerido = p_mes_sugerido,
      tipo = p_tipo,
      updated_at = now()
    WHERE id = p_id AND reporte_id = p_reporte_id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'La necesidad DNC no existe en este reporte';
    END IF;
  END IF;

  DELETE FROM public.dnc_necesidad_puestos WHERE necesidad_id = v_id;
  INSERT INTO public.dnc_necesidad_puestos (necesidad_id, position_id)
  SELECT v_id, id FROM unnest(p_position_ids) AS selected(id) GROUP BY id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.dnc_guardar_necesidad(uuid, uuid, uuid, uuid[], text, text, text, text, smallint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dnc_guardar_necesidad(uuid, uuid, uuid, uuid[], text, text, text, text, smallint, text) TO authenticated;
