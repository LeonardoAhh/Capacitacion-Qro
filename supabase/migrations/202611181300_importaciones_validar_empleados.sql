-- Las importaciones mensuales (incumplimientos, actas administrativas y
-- retardos) rechazan números de empleado que no existan en public.employees.
-- La regla vive en la validación compartida para no repetirla en cada RPC.
-- Requiere 202611091300_multi_month_employee_day_imports.sql y
-- 202611181200_retardos_validar_empleados.sql.

CREATE OR REPLACE FUNCTION public.validar_importacion_meses_conteos(
  p_periodos jsonb
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_periodo jsonb;
  v_mes text;
  v_inicio_mes date;
  v_dias_mes integer;
  v_faltantes text;
  v_total_faltantes integer;
BEGIN
  IF jsonb_typeof(p_periodos) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Los periodos deben ser un arreglo JSON con al menos un mes'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF jsonb_array_length(p_periodos) = 0 THEN
    RAISE EXCEPTION 'Los periodos deben ser un arreglo JSON con al menos un mes'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_periodos) AS periodo(value)
    WHERE jsonb_typeof(value) IS DISTINCT FROM 'object'
      OR jsonb_typeof(value -> 'mes') IS DISTINCT FROM 'string'
      OR coalesce(value ->> 'mes', '') !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
      OR jsonb_typeof(value -> 'registros') IS DISTINCT FROM 'array'
  ) THEN
    RAISE EXCEPTION 'Cada periodo requiere mes YYYY-MM y un arreglo de registros'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_periodos) AS periodo(value)
    GROUP BY value ->> 'mes'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'El archivo contiene meses duplicados'
      USING ERRCODE = 'unique_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_periodos) AS periodo(value)
    CROSS JOIN LATERAL jsonb_array_elements(value -> 'registros') AS registro(value)
    WHERE jsonb_typeof(registro.value) IS DISTINCT FROM 'object'
      OR jsonb_typeof(registro.value -> 'numero_empleado') IS DISTINCT FROM 'string'
      OR nullif(btrim(registro.value ->> 'numero_empleado'), '') IS NULL
      OR jsonb_typeof(registro.value -> 'dia') IS DISTINCT FROM 'number'
      OR coalesce(registro.value ->> 'dia', '') !~ '^(?:[1-9]|[12][0-9]|3[01])$'
      OR jsonb_typeof(registro.value -> 'cantidad') IS DISTINCT FROM 'number'
      OR coalesce(registro.value ->> 'cantidad', '') !~ '^[1-9][0-9]{0,9}$'
      OR CASE
        WHEN coalesce(registro.value ->> 'cantidad', '') ~ '^[1-9][0-9]{0,9}$'
          THEN (registro.value ->> 'cantidad')::numeric > 2147483647
        ELSE false
      END
  ) THEN
    RAISE EXCEPTION 'Registro inválido; cada fila requiere empleado, día y cantidad positiva'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_periodos) AS periodo(value)
    CROSS JOIN LATERAL jsonb_to_recordset(value -> 'registros')
      AS registro(numero_empleado text, dia integer, cantidad integer)
    GROUP BY value ->> 'mes', registro.numero_empleado, registro.dia
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'El archivo contiene días duplicados para un empleado y mes'
      USING ERRCODE = 'unique_violation';
  END IF;

  FOR v_periodo IN SELECT value FROM jsonb_array_elements(p_periodos) AS periodo(value)
  LOOP
    v_mes := v_periodo ->> 'mes';
    v_inicio_mes := make_date(
      split_part(v_mes, '-', 1)::integer,
      split_part(v_mes, '-', 2)::integer,
      1
    );
    v_dias_mes := extract(day FROM (v_inicio_mes + interval '1 month - 1 day'))::integer;

    IF EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(v_periodo -> 'registros')
        AS registro(numero_empleado text, dia integer, cantidad integer)
      WHERE dia < 1 OR dia > v_dias_mes
    ) THEN
      RAISE EXCEPTION 'El archivo contiene días fuera de %', v_mes
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END LOOP;

  -- Todos los números de empleado deben existir en Plantilla (public.employees).
  SELECT count(*), string_agg(numeros.numero, ', ' ORDER BY numeros.numero)
  INTO v_total_faltantes, v_faltantes
  FROM (
    SELECT DISTINCT btrim(registro.value ->> 'numero_empleado') AS numero
    FROM jsonb_array_elements(p_periodos) AS periodo(value)
    CROSS JOIN LATERAL jsonb_array_elements(periodo.value -> 'registros') AS registro(value)
  ) AS numeros
  WHERE NOT EXISTS (
    SELECT 1 FROM public.employees AS e WHERE e.numero = numeros.numero
  );

  IF v_total_faltantes > 0 THEN
    RAISE EXCEPTION 'No existen en Plantilla % número(s) de empleado: %',
      v_total_faltantes,
      left(v_faltantes, 300)
      USING ERRCODE = 'foreign_key_violation';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_importacion_meses_conteos(jsonb)
  FROM PUBLIC, anon, authenticated;

-- Retardos: la validación de empleados ya ocurre en la regla compartida.
CREATE OR REPLACE FUNCTION public.reemplazar_meses_retardos(
  p_periodos jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'dev' THEN
    RAISE EXCEPTION 'Solo dev puede importar retardos'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM pg_advisory_xact_lock(20261118, 1);
  -- Valida meses, días, cantidades y que los empleados existan (regla compartida).
  PERFORM public.validar_importacion_meses_conteos(p_periodos);

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_periodos) AS periodo(value)
    CROSS JOIN LATERAL jsonb_array_elements(value -> 'registros') AS registro(value)
    WHERE jsonb_typeof(registro.value -> 'minutos') IS DISTINCT FROM 'number'
      OR coalesce(registro.value ->> 'minutos', '') !~ '^[0-9]{1,10}$'
      OR CASE
        WHEN coalesce(registro.value ->> 'minutos', '') ~ '^[0-9]{1,10}$'
          THEN (registro.value ->> 'minutos')::numeric > 2147483647
        ELSE false
      END
  ) THEN
    RAISE EXCEPTION 'Registro inválido; cada fila requiere minutos enteros mayores o iguales a cero'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  DELETE FROM public.retardos
  WHERE mes IN (
    SELECT value ->> 'mes'
    FROM jsonb_array_elements(p_periodos) AS periodo(value)
  );

  INSERT INTO public.retardos (numero_empleado, mes, dia, cantidad, minutos, registrado_por)
  SELECT btrim(registro.numero_empleado),
         periodo.value ->> 'mes',
         registro.dia,
         registro.cantidad,
         registro.minutos,
         auth.uid()
  FROM jsonb_array_elements(p_periodos) AS periodo(value)
  CROSS JOIN LATERAL jsonb_to_recordset(periodo.value -> 'registros')
    AS registro(numero_empleado text, dia integer, cantidad integer, minutos integer);
END;
$$;

REVOKE ALL ON FUNCTION public.reemplazar_meses_retardos(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reemplazar_meses_retardos(jsonb)
  TO authenticated;
