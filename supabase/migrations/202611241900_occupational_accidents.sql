-- Accidentes en planta (Occupational Health), del espacio de Seguridad e Higiene.
-- Solo dev y ehs (puede_gestionar_seguridad) leen y gestionan los registros.
CREATE TABLE IF NOT EXISTS public.occupational_accidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accident_date date NOT NULL,
  employee_number text NOT NULL CHECK (employee_number ~ '^\d+$'),
  -- Nombre al registrar: lo toma el trigger de la plantilla, no del cliente.
  employee_name text NOT NULL,
  description text NOT NULL CHECK (length(btrim(description)) BETWEEN 1 AND 500),
  work_risk boolean NOT NULL,
  incident_report boolean NOT NULL,
  care text[] NOT NULL DEFAULT '{}'
    CHECK (care <@ ARRAY['servicio_medico', 'clinica_particular', 'imss']::text[]),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS occupational_accidents_date_idx
  ON public.occupational_accidents (accident_date DESC, created_at DESC);

-- El colaborador debe existir en la plantilla o en nuevo ingreso; su nombre sale de ahí.
CREATE OR REPLACE FUNCTION public.occupational_accidents_colaborador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  nombre_actual text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.employee_number = OLD.employee_number THEN
    NEW.employee_name := OLD.employee_name;
    RETURN NEW;
  END IF;

  SELECT t.nombre INTO nombre_actual
  FROM (
    SELECT n.nombre::text, 0 AS prioridad FROM public.nuevo_ingreso n
    WHERE n.numero::text = NEW.employee_number AND n.tipo_contrato IS DISTINCT FROM 'Indeterminado'
    UNION ALL
    SELECT e.nombre::text, 1 FROM public.employees e WHERE e.numero::text = NEW.employee_number
  ) t
  ORDER BY t.prioridad
  LIMIT 1;

  IF nombre_actual IS NULL THEN
    RAISE EXCEPTION 'El número de empleado % no existe', NEW.employee_number USING ERRCODE = '23503';
  END IF;
  NEW.employee_name := nombre_actual;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.occupational_accidents_colaborador() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS occupational_accidents_colaborador ON public.occupational_accidents;
CREATE TRIGGER occupational_accidents_colaborador
  BEFORE INSERT OR UPDATE OF employee_number ON public.occupational_accidents
  FOR EACH ROW EXECUTE FUNCTION public.occupational_accidents_colaborador();

ALTER TABLE public.occupational_accidents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.occupational_accidents FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.occupational_accidents TO authenticated;
-- Se editan los datos del accidente; autor y fecha de alta no cambian.
GRANT UPDATE (accident_date, employee_number, description, work_risk, incident_report, care)
  ON public.occupational_accidents TO authenticated;

DROP POLICY IF EXISTS occupational_accidents_read ON public.occupational_accidents;
DROP POLICY IF EXISTS occupational_accidents_create ON public.occupational_accidents;
DROP POLICY IF EXISTS occupational_accidents_update ON public.occupational_accidents;
DROP POLICY IF EXISTS occupational_accidents_delete ON public.occupational_accidents;

CREATE POLICY occupational_accidents_read ON public.occupational_accidents
  FOR SELECT TO authenticated USING (public.puede_gestionar_seguridad());
CREATE POLICY occupational_accidents_create ON public.occupational_accidents
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.puede_gestionar_seguridad());
CREATE POLICY occupational_accidents_update ON public.occupational_accidents
  FOR UPDATE TO authenticated
  USING (public.puede_gestionar_seguridad())
  WITH CHECK (public.puede_gestionar_seguridad());
CREATE POLICY occupational_accidents_delete ON public.occupational_accidents
  FOR DELETE TO authenticated USING (public.puede_gestionar_seguridad());
