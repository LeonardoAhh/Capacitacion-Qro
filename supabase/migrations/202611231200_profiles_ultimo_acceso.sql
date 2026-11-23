-- Último acceso en Inicio: al iniciar sesión, el acceso vigente pasa a ser el
-- anterior y se registra el nuevo. Inicio muestra el anterior para que cada
-- quien detecte un acceso que no reconozca.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ultimo_acceso timestamptz,
  ADD COLUMN IF NOT EXISTS acceso_anterior timestamptz;

CREATE OR REPLACE FUNCTION public.registrar_acceso()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET acceso_anterior = ultimo_acceso,
         ultimo_acceso = now()
   WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.registrar_acceso() FROM public;
GRANT EXECUTE ON FUNCTION public.registrar_acceso() TO authenticated;
