-- Búsqueda de colaboradores por número para Seguridad e Higiene (Occupational Health).
-- El rol ehs no lee la tabla de empleados; esta función solo expone número, nombre,
-- puesto y departamento a dev y ehs, buscando por el inicio del número de empleado.
-- Incluye nuevo ingreso aún no indeterminado (su registro manda sobre el de planta).
CREATE OR REPLACE FUNCTION public.ehs_buscar_empleados(p_numero text)
RETURNS TABLE (numero text, nombre text, puesto text, departamento text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH termino AS (
    SELECT regexp_replace(coalesce(p_numero, ''), '\D', '', 'g') AS digitos
  )
  SELECT DISTINCT ON (t.numero) t.numero, t.nombre, t.puesto, t.departamento
  FROM (
    SELECT e.numero::text, e.nombre::text, e.puesto::text, e.departamento::text, 1 AS prioridad
    FROM public.employees e
    UNION ALL
    SELECT n.numero::text, n.nombre::text, n.puesto::text, n.departamento::text, 0
    FROM public.nuevo_ingreso n
    WHERE n.tipo_contrato IS DISTINCT FROM 'Indeterminado'
  ) t, termino
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('dev', 'ehs'))
    AND termino.digitos <> ''
    AND t.numero LIKE termino.digitos || '%'
  ORDER BY t.numero, t.prioridad
  LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.ehs_buscar_empleados(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ehs_buscar_empleados(text) TO authenticated;
