-- Puesto visible en el menú de cuenta (en lugar del rol). El rol sigue
-- decidiendo los permisos. Solo el dev (o el SQL editor) lo captura:
--   update profiles set puesto = 'Coordinadora EHS' where email = '…';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS puesto text;

-- Cada usuario puede editar su propio perfil; el puesto no.
CREATE OR REPLACE FUNCTION public.profiles_guard_puesto()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.puesto IS DISTINCT FROM OLD.puesto
     AND auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'dev') THEN
    RAISE EXCEPTION 'Only dev role can change the puesto column'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_puesto_trg ON public.profiles;
CREATE TRIGGER profiles_guard_puesto_trg
  BEFORE UPDATE OF puesto ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_puesto();
