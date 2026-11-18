-- Retardos capturados manualmente por empleado y día.
-- Mismo modelo que public.incumplimientos_reglamento: una fila por empleado,
-- mes y día con la cantidad total. Solo el rol dev captura, mediante RPC.

CREATE TABLE IF NOT EXISTS public.retardos (
  numero_empleado text NOT NULL CHECK (btrim(numero_empleado) <> ''),
  mes text NOT NULL CHECK (mes ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  dia smallint NOT NULL CHECK (dia BETWEEN 1 AND 31),
  cantidad integer NOT NULL CHECK (cantidad > 0),
  registrado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (numero_empleado, mes, dia)
);

CREATE INDEX IF NOT EXISTS retardos_mes_idx
  ON public.retardos (mes);

ALTER TABLE public.retardos ENABLE ROW LEVEL SECURITY;

-- Lectura según el alcance del usuario; escritura solo por la RPC.
REVOKE ALL ON public.retardos FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.retardos TO authenticated;

DROP POLICY IF EXISTS retardos_select ON public.retardos;
CREATE POLICY retardos_select
  ON public.retardos
  FOR SELECT TO authenticated
  USING (public.can_evaluate_employee(numero_empleado));

CREATE OR REPLACE FUNCTION public.registrar_retardo(
  p_numero_empleado text,
  p_fecha date,
  p_cantidad integer,
  p_cantidad_anterior integer DEFAULT NULL
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
    INSERT INTO public.retardos (
      numero_empleado,
      mes,
      dia,
      cantidad,
      registrado_por
    )
    VALUES (
      btrim(p_numero_empleado),
      v_mes,
      v_dia,
      p_cantidad,
      auth.uid()
    )
    ON CONFLICT (numero_empleado, mes, dia) DO NOTHING;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'Ya existe un retardo para esa fecha. Recarga los datos antes de actualizar la cantidad.'
        USING ERRCODE = 'unique_violation';
    END IF;
  ELSE
    IF p_cantidad_anterior < 1 THEN
      RAISE EXCEPTION 'La cantidad registrada previamente no es válida'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Concurrencia optimista: solo actualiza si nadie cambió la cantidad.
    UPDATE public.retardos
    SET cantidad = p_cantidad,
        registrado_por = auth.uid()
    WHERE numero_empleado = btrim(p_numero_empleado)
      AND mes = v_mes
      AND dia = v_dia
      AND cantidad = p_cantidad_anterior;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'El registro cambió mientras confirmabas. Recarga los datos y vuelve a validar la cantidad.'
        USING ERRCODE = 'serialization_failure';
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_retardo(text, date, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_retardo(text, date, integer, integer)
  TO authenticated;
