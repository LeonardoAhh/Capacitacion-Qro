-- Retardos con minutos e importación mensual.
-- Requiere 202611181000_retardos.sql y 202611091300_multi_month_employee_day_imports.sql
-- (usa public.validar_importacion_meses_conteos).

ALTER TABLE public.retardos
  ADD COLUMN IF NOT EXISTS minutos integer NOT NULL DEFAULT 0 CHECK (minutos >= 0);

-- La captura individual ahora incluye minutos; se reemplaza la firma anterior.
DROP FUNCTION IF EXISTS public.registrar_retardo(text, date, integer, integer);

CREATE OR REPLACE FUNCTION public.registrar_retardo(
  p_numero_empleado text,
  p_fecha date,
  p_cantidad integer,
  p_minutos integer,
  p_cantidad_anterior integer DEFAULT NULL,
  p_minutos_anterior integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rows integer;
  v_mes text;
  v_dia smallint;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'dev' THEN
    RAISE EXCEPTION 'Solo dev puede capturar retardos'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_numero_empleado IS NULL OR nullif(btrim(p_numero_empleado), '') IS NULL THEN
    RAISE EXCEPTION 'El número de empleado es obligatorio'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_fecha IS NULL THEN
    RAISE EXCEPTION 'La fecha es obligatoria'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_cantidad IS NULL OR p_cantidad < 1 THEN
    RAISE EXCEPTION 'La cantidad debe ser un entero mayor que cero'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_minutos IS NULL OR p_minutos < 0 THEN
    RAISE EXCEPTION 'Los minutos deben ser un entero mayor o igual a cero'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE numero = btrim(p_numero_empleado)
  ) THEN
    RAISE EXCEPTION 'No existe un empleado con el número indicado'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_mes := to_char(p_fecha, 'YYYY-MM');
  v_dia := extract(day FROM p_fecha)::smallint;

  IF p_cantidad_anterior IS NULL THEN
    INSERT INTO public.retardos (numero_empleado, mes, dia, cantidad, minutos, registrado_por)
    VALUES (btrim(p_numero_empleado), v_mes, v_dia, p_cantidad, p_minutos, auth.uid())
    ON CONFLICT (numero_empleado, mes, dia) DO NOTHING;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'Ya existe un retardo para esa fecha. Recarga los datos antes de actualizar la cantidad.'
        USING ERRCODE = 'unique_violation';
    END IF;
  ELSE
    IF p_cantidad_anterior < 1 OR p_minutos_anterior IS NULL OR p_minutos_anterior < 0 THEN
      RAISE EXCEPTION 'El registro anterior no es válido'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Concurrencia optimista: solo actualiza si nadie cambió el registro.
    UPDATE public.retardos
    SET cantidad = p_cantidad,
        minutos = p_minutos,
        registrado_por = auth.uid()
    WHERE numero_empleado = btrim(p_numero_empleado)
      AND mes = v_mes
      AND dia = v_dia
      AND cantidad = p_cantidad_anterior
      AND minutos = p_minutos_anterior;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'El registro cambió mientras confirmabas. Recarga los datos y vuelve a validar.'
        USING ERRCODE = 'serialization_failure';
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_retardo(text, date, integer, integer, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_retardo(text, date, integer, integer, integer, integer)
  TO authenticated;

-- Reemplaza en una sola transacción los meses incluidos en el archivo.
-- p_periodos: [{ mes: 'YYYY-MM', registros: [{ numero_empleado, dia, cantidad, minutos }] }]
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
