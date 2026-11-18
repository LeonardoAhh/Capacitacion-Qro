-- La importación de retardos rechaza números de nómina que no existan en
-- public.employees (misma regla que la captura individual). Requiere
-- 202611181100_retardos_minutos_importacion.sql.

CREATE OR REPLACE FUNCTION public.reemplazar_meses_retardos(
  p_periodos jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_faltantes text;
  v_total_faltantes integer;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'dev' THEN
    RAISE EXCEPTION 'Solo dev puede importar retardos'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM pg_advisory_xact_lock(20261118, 1);
  -- Valida meses, empleados, días y cantidades con la regla compartida.
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

  -- Todos los números de nómina deben existir en Plantilla.
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
    RAISE EXCEPTION 'No existen en Plantilla % número(s) de nómina: %',
      v_total_faltantes,
      left(v_faltantes, 300)
      USING ERRCODE = 'foreign_key_violation';
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
