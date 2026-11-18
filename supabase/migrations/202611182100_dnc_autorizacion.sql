-- DNC: autorización de cada necesidad (autorizada / no autorizada) con motivo
-- obligatorio cuando no se autoriza. Requiere 202611182000_dnc_anual.sql.
-- Las necesidades capturadas antes quedan sin autorización (NULL).

ALTER TABLE public.dnc_necesidades
  ADD COLUMN IF NOT EXISTS autorizacion text,
  ADD COLUMN IF NOT EXISTS motivo_no_autorizado text;

ALTER TABLE public.dnc_necesidades
  ADD CONSTRAINT dnc_necesidades_autorizacion_check
    CHECK (autorizacion IS NULL OR autorizacion IN ('autorizado', 'no_autorizado')),
  ADD CONSTRAINT dnc_necesidades_motivo_no_autorizado_check
    CHECK (
      CASE autorizacion
        WHEN 'no_autorizado' THEN length(btrim(coalesce(motivo_no_autorizado, ''))) > 0
        ELSE motivo_no_autorizado IS NULL
      END
    );

-- La firma cambia (dos parámetros nuevos): se elimina la anterior para no dejar
-- una versión que guarde sin autorización.
DROP FUNCTION IF EXISTS public.dnc_guardar_necesidad(uuid, uuid, uuid, uuid[], text, text, text, text, smallint, text);

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
  p_tipo text,
  p_autorizacion text,
  p_motivo_no_autorizado text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_department_id uuid;
  v_course_name text;
  v_id uuid;
  v_motivo_no_autorizado text := nullif(btrim(coalesce(p_motivo_no_autorizado, '')), '');
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'dev' THEN
    RAISE EXCEPTION 'No tienes permiso para modificar el DNC';
  END IF;

  IF p_autorizacion IS NULL OR p_autorizacion NOT IN ('autorizado', 'no_autorizado') THEN
    RAISE EXCEPTION 'Indica si la necesidad fue autorizada';
  END IF;
  IF p_autorizacion = 'no_autorizado' AND v_motivo_no_autorizado IS NULL THEN
    RAISE EXCEPTION 'Indica el motivo por el que no se autorizó';
  END IF;
  IF p_autorizacion = 'autorizado' THEN
    v_motivo_no_autorizado := NULL;
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
      motivo, beneficio, mes_sugerido, tipo, autorizacion, motivo_no_autorizado
    ) VALUES (
      p_reporte_id,
      COALESCE((SELECT max(orden) FROM public.dnc_necesidades WHERE reporte_id = p_reporte_id), 0) + 1,
      p_course_id, v_course_name, btrim(p_necesidad), btrim(p_funcion_actividad),
      btrim(p_motivo), btrim(p_beneficio), p_mes_sugerido, p_tipo,
      p_autorizacion, v_motivo_no_autorizado
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
      autorizacion = p_autorizacion,
      motivo_no_autorizado = v_motivo_no_autorizado,
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

REVOKE ALL ON FUNCTION public.dnc_guardar_necesidad(uuid, uuid, uuid, uuid[], text, text, text, text, smallint, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dnc_guardar_necesidad(uuid, uuid, uuid, uuid[], text, text, text, text, smallint, text, text, text) TO authenticated;
