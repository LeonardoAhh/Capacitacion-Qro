-- Omisiones de marcaje por empleado y día.
-- Mismo modelo que public.retardos: una fila por empleado, mes y día con la cantidad.
-- `tipos` guarda un tipo por omisión (entrada, salida, salida a comer, regreso de comer).
-- Solo hay captura individual: la cantidad del día es cuántos tipos se marcaron.
-- Requiere 202611211000_roles_analista_auxiliar_ehs.sql (roles).

CREATE TABLE IF NOT EXISTS public.omisiones_marcaje (
  numero_empleado text NOT NULL CHECK (btrim(numero_empleado) <> ''),
  mes text NOT NULL CHECK (mes ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  dia smallint NOT NULL CHECK (dia BETWEEN 1 AND 31),
  cantidad integer NOT NULL CHECK (cantidad > 0),
  tipos text[] NOT NULL
    CHECK (tipos <@ ARRAY['entrada', 'salida', 'salida_comida', 'regreso_comida']::text[]),
  registrado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (numero_empleado, mes, dia),
  -- Exactamente un tipo por omisión.
  CONSTRAINT omisiones_marcaje_tipos_cantidad
    CHECK (cardinality(tipos) = cantidad)
);

CREATE INDEX IF NOT EXISTS omisiones_marcaje_mes_idx
  ON public.omisiones_marcaje (mes);

ALTER TABLE public.omisiones_marcaje ENABLE ROW LEVEL SECURITY;

-- Lectura según el alcance del usuario; escritura solo por las RPC.
REVOKE ALL ON public.omisiones_marcaje FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.omisiones_marcaje TO authenticated;

DROP POLICY IF EXISTS omisiones_marcaje_select ON public.omisiones_marcaje;
CREATE POLICY omisiones_marcaje_select
  ON public.omisiones_marcaje
  FOR SELECT TO authenticated
  USING (public.can_evaluate_employee(numero_empleado));

-- Todos los roles con acceso a la plantilla capturan; el evaluador no.
CREATE OR REPLACE FUNCTION public.puede_capturar_omisiones_marcaje()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(public.get_my_role() IN ('dev', 'analista', 'admin', 'auxiliar'), false);
$$;

REVOKE ALL ON FUNCTION public.puede_capturar_omisiones_marcaje() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.puede_capturar_omisiones_marcaje() TO authenticated;

-- Captura individual: los tipos marcados definen la cantidad del día.
-- p_tipos_anteriores permite concurrencia optimista al editar un día existente.
CREATE OR REPLACE FUNCTION public.registrar_omision_marcaje(
  p_numero_empleado text,
  p_fecha date,
  p_tipos text[],
  p_cantidad_anterior integer DEFAULT NULL,
  p_tipos_anteriores text[] DEFAULT NULL
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
  v_tipos text[];
BEGIN
  IF NOT public.puede_capturar_omisiones_marcaje() THEN
    RAISE EXCEPTION 'Tu rol no puede capturar omisiones de marcaje'
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

  -- Sin repetidos y en orden fijo, para comparar y guardar siempre igual.
  SELECT coalesce(array_agg(DISTINCT tipo ORDER BY tipo), '{}')
    INTO v_tipos
    FROM unnest(coalesce(p_tipos, '{}')) AS tipo;

  IF cardinality(v_tipos) = 0 THEN
    RAISE EXCEPTION 'Marca al menos un tipo de omisión'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF NOT v_tipos <@ ARRAY['entrada', 'salida', 'salida_comida', 'regreso_comida']::text[] THEN
    RAISE EXCEPTION 'Tipo de omisión no válido'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.employees WHERE numero = btrim(p_numero_empleado)
  ) THEN
    RAISE EXCEPTION 'No existe un empleado con el número indicado'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_mes := to_char(p_fecha, 'YYYY-MM');
  v_dia := extract(day FROM p_fecha)::smallint;

  IF p_cantidad_anterior IS NULL THEN
    INSERT INTO public.omisiones_marcaje (numero_empleado, mes, dia, cantidad, tipos, registrado_por)
    VALUES (btrim(p_numero_empleado), v_mes, v_dia, cardinality(v_tipos), v_tipos, auth.uid())
    ON CONFLICT (numero_empleado, mes, dia) DO NOTHING;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'Ya existe una omisión para esa fecha. Recarga los datos antes de actualizarla.'
        USING ERRCODE = 'unique_violation';
    END IF;
  ELSE
    -- Concurrencia optimista: solo actualiza si nadie cambió el registro.
    UPDATE public.omisiones_marcaje
    SET cantidad = cardinality(v_tipos),
        tipos = v_tipos,
        registrado_por = auth.uid()
    WHERE numero_empleado = btrim(p_numero_empleado)
      AND mes = v_mes
      AND dia = v_dia
      AND cantidad = p_cantidad_anterior
      AND tipos = p_tipos_anteriores;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'El registro cambió mientras confirmabas. Recarga los datos y vuelve a validar.'
        USING ERRCODE = 'serialization_failure';
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_omision_marcaje(text, date, text[], integer, text[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_omision_marcaje(text, date, text[], integer, text[])
  TO authenticated;
