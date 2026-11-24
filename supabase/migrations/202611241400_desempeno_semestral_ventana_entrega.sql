-- Candado semestral: la evaluación semestral solo se captura durante la recepción
-- de físicos (DIC-MAY: 1–15 de junio; JUN-NOV: 1–15 de diciembre). Después de esa
-- fecha pasa a Regularización. Antes, el JUN-NOV vencía el 15 de enero; ahora
-- vence el 15 de diciembre, igual que lib/desempeno/ventana-entrega.ts.
BEGIN;

CREATE OR REPLACE FUNCTION public.desempeno_regularizacion_pendientes()
RETURNS TABLE (
  numero text,
  nombre text,
  puesto text,
  periodo text,
  fecha_limite date,
  origen text,
  hito_nuevo_ingreso smallint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hoy date := (now() AT TIME ZONE 'America/Mexico_City')::date;
BEGIN
  IF auth.uid() IS NULL OR coalesce(public.get_my_role(), '') NOT IN ('admin', 'dev') THEN
    RAISE EXCEPTION 'Acceso no autorizado a regularización'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH meses AS (
    SELECT ARRAY['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']::text[] AS nombres
  ),
  primer_semestre AS (
    SELECT min(
      CASE WHEN p.periodo_normalizado LIKE 'DIC-MAY %'
        THEN make_date(right(p.periodo_normalizado, 4)::integer, 5, 31)
        ELSE make_date(right(p.periodo_normalizado, 4)::integer, 11, 30)
      END
    ) AS fecha_cierre
    FROM (
      SELECT upper(regexp_replace(regexp_replace(btrim(e.periodo), '[[:space:]]*-[[:space:]]*', '-', 'g'), '[[:space:]]+', ' ', 'g')) AS periodo_normalizado
      FROM public.evaluaciones_desempeno e
      WHERE e.periodo IS NOT NULL
    ) p
    WHERE p.periodo_normalizado ~ '^(DIC-MAY|JUN-NOV) [0-9]{4}$'
  ),
  mensuales AS (
    SELECT n.numero, n.nombre, coalesce(n.puesto, '') AS puesto,
      m.nombres[CASE WHEN extract(month FROM plazo.fecha)::integer = 1 THEN 12 ELSE extract(month FROM plazo.fecha)::integer - 1 END]
        || '-' || m.nombres[extract(month FROM plazo.fecha)::integer]
        || ' ' || extract(year FROM plazo.fecha)::integer AS periodo,
      plazo.fecha AS fecha_limite,
      'nuevo_ingreso'::text AS origen,
      plazo.hito AS hito_nuevo_ingreso
    FROM public.nuevo_ingreso n
    CROSS JOIN meses m
    CROSS JOIN LATERAL (VALUES
      (n.eval_1_fecha, n.eval_1_calificacion, 1::smallint),
      (n.eval_2_fecha, n.eval_2_calificacion, 2::smallint),
      (n.eval_3_fecha, n.eval_3_calificacion, 3::smallint)
    ) AS plazo(fecha, calificacion, hito)
    WHERE n.numero IS NOT NULL
      AND n.tipo_contrato IS DISTINCT FROM 'Indeterminado'
      AND plazo.calificacion IS NULL
      AND plazo.fecha < v_hoy - CASE WHEN plazo.hito IN (1, 2) THEN 1 ELSE 0 END
  ),
  semestrales AS (
    SELECT e.numero, e.nombre, coalesce(e.puesto, '') AS puesto,
      tramo.etiqueta || ' ' || anos.anio AS periodo,
      tramo.fecha_limite,
      'planta'::text AS origen,
      NULL::smallint AS hito_nuevo_ingreso
    FROM public.employees e
    CROSS JOIN primer_semestre inicio
    CROSS JOIN LATERAL generate_series(
      extract(year FROM inicio.fecha_cierre)::integer,
      extract(year FROM v_hoy)::integer
    ) AS anos(anio)
    CROSS JOIN LATERAL (VALUES
      ('DIC-MAY'::text, make_date(anos.anio, 5, 31), make_date(anos.anio, 6, 15)),
      ('JUN-NOV'::text, make_date(anos.anio, 11, 30), make_date(anos.anio, 12, 15))
    ) AS tramo(etiqueta, fecha_cierre, fecha_limite)
    WHERE e.numero IS NOT NULL
      AND tramo.fecha_cierre >= inicio.fecha_cierre
      AND tramo.fecha_limite < v_hoy
      AND public.desempeno_es_elegible_periodo(tramo.etiqueta || ' ' || anos.anio, e.numero)
      AND NOT EXISTS (
        SELECT 1 FROM public.nuevo_ingreso n
        WHERE n.numero = e.numero AND n.tipo_contrato IS DISTINCT FROM 'Indeterminado'
      )
  ),
  candidatas AS (
    SELECT * FROM mensuales
    UNION ALL
    SELECT * FROM semestrales
  ),
  unicas AS (
    SELECT DISTINCT ON (c.numero, c.periodo, c.hito_nuevo_ingreso)
      c.numero, c.nombre, c.puesto, c.periodo, c.fecha_limite, c.origen, c.hito_nuevo_ingreso
    FROM candidatas c
    ORDER BY c.numero, c.periodo, c.hito_nuevo_ingreso, c.fecha_limite
  )
  SELECT c.numero, c.nombre, c.puesto, c.periodo, c.fecha_limite, c.origen, c.hito_nuevo_ingreso
  FROM unicas c
  WHERE c.hito_nuevo_ingreso IS NOT NULL OR NOT EXISTS (
    SELECT 1 FROM public.evaluaciones_desempeno guardada
    WHERE guardada.numero_empleado = c.numero
      AND upper(regexp_replace(regexp_replace(btrim(guardada.periodo), '[[:space:]]*-[[:space:]]*', '-', 'g'), '[[:space:]]+', ' ', 'g')) = c.periodo
  )
  ORDER BY c.fecha_limite, c.nombre, c.periodo, c.hito_nuevo_ingreso;
END;
$$;

COMMIT;
