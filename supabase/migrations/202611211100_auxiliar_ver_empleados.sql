-- El auxiliar consulta la plantilla completa: empleados y sus incidencias,
-- incumplimientos y retardos. Todas esas lecturas pasan por
-- can_evaluate_employee(), que lee profiles.role directo y solo dejaba ver todo
-- a dev y admin (y al analista desde 202611211000). Se agrega auxiliar.
-- Debe coincidir con lib/constants/roles.ts.
DO $$
DECLARE
  definicion TEXT;
  nueva TEXT;
BEGIN
  definicion := pg_get_functiondef('public.can_evaluate_employee(text)'::regprocedure);
  IF position('''admin'', ''auxiliar'')' IN definicion) > 0 THEN
    RETURN; -- ya aplicada
  END IF;
  nueva := replace(definicion,
    'v_role IN (''dev'', ''analista'', ''admin'')',
    'v_role IN (''dev'', ''analista'', ''admin'', ''auxiliar'')');
  IF nueva = definicion THEN
    nueva := replace(definicion,
      'v_role IN (''dev'', ''admin'')',
      'v_role IN (''dev'', ''analista'', ''admin'', ''auxiliar'')');
  END IF;
  IF nueva = definicion THEN
    RAISE EXCEPTION 'No se encontró la lista de roles en can_evaluate_employee()';
  END IF;
  EXECUTE nueva;
END;
$$;
